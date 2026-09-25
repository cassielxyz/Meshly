import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chunks, linkedAccounts, logicalFiles } from "@/db/schema";
import { downloadDriveFile, exportDriveFile } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/security/crypto";

function rangeOf(header: string | null, size: number) {
  if (size === 0) return { start: 0, end: -1, partial: false };
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d+)-(\d*)$/.exec(header);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= size) return null;
  return { start, end, partial: true };
}
function dispositionHeader(disposition: "attachment" | "inline", name: string) {
  return `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`;
}
function nativeExport(mimeType: string) {
  if (mimeType === "application/vnd.google-apps.document") return { mimeType: "application/pdf", extension: ".pdf" };
  if (mimeType === "application/vnd.google-apps.spreadsheet") return { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: ".xlsx" };
  if (mimeType === "application/vnd.google-apps.presentation") return { mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: ".pptx" };
  if (mimeType === "application/vnd.google-apps.drawing") return { mimeType: "application/pdf", extension: ".pdf" };
  return null;
}

async function streamExternal(file: typeof logicalFiles.$inferSelect, rangeHeader: string | null, disposition: "attachment" | "inline") {
  if (!file.sourceAccountId || !file.sourceDriveFileId || !file.sourceMimeType) return new Response("Indexed source is unavailable", { status: 409 });
  const db = getDb();
  const account = (await db.select().from(linkedAccounts).where(eq(linkedAccounts.id, file.sourceAccountId)).limit(1))[0];
  if (!account) return new Response("Source account is disconnected", { status: 409 });
  const access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));

  if (file.sourceMimeType.startsWith("application/vnd.google-apps.")) {
    const target = nativeExport(file.sourceMimeType);
    if (!target) {
      if (file.sourceWebViewLink) return Response.redirect(file.sourceWebViewLink, 302);
      return new Response("This Google-native file must be opened in Google Drive", { status: 415 });
    }
    const response = await exportDriveFile(access, file.sourceDriveFileId, target.mimeType);
    if (!response.ok || !response.body) return new Response("Google-native export failed", { status: 502 });
    const name = file.name.toLowerCase().endsWith(target.extension) ? file.name : `${file.name}${target.extension}`;
    const headers = new Headers({
      "Content-Type": target.mimeType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": dispositionHeader(disposition, name),
    });
    const length = response.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(response.body, { status: 200, headers });
  }

  const response = await downloadDriveFile(access, file.sourceDriveFileId, rangeHeader ?? undefined);
  if (!response.ok || !response.body) return new Response(`Drive download failed (${response.status})`, { status: response.status === 404 ? 404 : 502 });
  const headers = new Headers({
    "Content-Type": file.sourceMimeType || response.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": "private, no-store",
    "Content-Disposition": dispositionHeader(disposition, file.name),
    "Accept-Ranges": "bytes",
  });
  for (const header of ["content-length", "content-range"]) {
    const value = response.headers.get(header);
    if (value) headers.set(header, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

export async function streamLogicalFile(fileId: string, rangeHeader: string | null, disposition: "attachment" | "inline" = "attachment") {
  const db = getDb();
  const file = (await db.select().from(logicalFiles).where(eq(logicalFiles.id, fileId)).limit(1))[0];
  if (!file || file.status !== "ready" || file.trashedAt) return new Response("Not found", { status: 404 });
  if (file.mimeType === "application/vnd.meshly.folder") return new Response("Folders cannot be downloaded directly", { status: 400 });
  if (file.sourceKind === "external") return streamExternal(file, rangeHeader, disposition);

  const requested = rangeOf(rangeHeader, file.size);
  if (!requested) return new Response("Invalid range", { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
  const rows = await db.select({ chunk: chunks, account: linkedAccounts }).from(chunks).innerJoin(linkedAccounts, eq(chunks.accountId, linkedAccounts.id)).where(eq(chunks.fileId, file.id)).orderBy(asc(chunks.part));
  const relevant = rows.filter(({ chunk }) => chunk.offset <= requested.end && chunk.offset + chunk.size - 1 >= requested.start);
  if (!relevant.length || relevant.some((item) => !item.chunk.driveFileId || item.chunk.status !== "ready")) return new Response("File is incomplete", { status: 409 });

  let index = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const tokenCache = new Map<string, string>();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          if (reader) {
            const next = await reader.read();
            if (!next.done) {
              controller.enqueue(next.value);
              return;
            }
            reader = null;
            index++;
          }
          if (index >= relevant.length) {
            controller.close();
            return;
          }
          const { chunk, account } = relevant[index];
          let access = tokenCache.get(account.id);
          if (!access) {
            access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
            tokenCache.set(account.id, access);
          }
          const localStart = Math.max(requested.start, chunk.offset) - chunk.offset;
          const localEnd = Math.min(requested.end, chunk.offset + chunk.size - 1) - chunk.offset;
          const response = await downloadDriveFile(access, chunk.driveFileId!, `bytes=${localStart}-${localEnd}`);
          if (!response.ok || !response.body) throw new Error(`Drive chunk download failed (${response.status})`);
          reader = response.body.getReader();
        }
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      void reader?.cancel();
    },
  });

  const length = requested.end - requested.start + 1;
  const headers = new Headers({
    "Content-Type": file.mimeType || "application/octet-stream",
    "Content-Length": String(length),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": dispositionHeader(disposition, file.name),
  });
  if (requested.partial) headers.set("Content-Range", `bytes ${requested.start}-${requested.end}/${file.size}`);
  return new Response(stream, { status: requested.partial ? 206 : 200, headers });
}
