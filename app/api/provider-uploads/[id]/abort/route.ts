import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { logicalFiles } from "@/db/schema";
import { deleteDropboxPath, getDropboxAccessToken, tryGetDropboxMetadata } from "@/lib/providers/dropbox";
import { deleteTeraBoxFile, getTeraBoxFileMetadata } from "@/lib/providers/terabox";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const db = getDb();
    const row = (await db.select({ object: providerObjects, account: providerAccounts, file: logicalFiles })
      .from(providerObjects)
      .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
      .innerJoin(logicalFiles, eq(providerObjects.fileId, logicalFiles.id))
      .where(and(eq(providerObjects.id, id), eq(providerAccounts.userId, userId), eq(logicalFiles.userId, userId)))
      .limit(1))[0];
    if (!row) return NextResponse.json({ ok: true, alreadyGone: true });
    if (row.object.status === "ready" || row.file.status === "ready") return NextResponse.json({ error: "committed_provider_object_must_be_deleted_normally" }, { status: 409 });

    if (row.object.provider === "dropbox" && row.object.remotePath) {
      const accessToken = await getDropboxAccessToken(row.account);
      const remote = await tryGetDropboxMetadata(accessToken, row.object.remotePath);
      if (remote) await deleteDropboxPath(accessToken, row.object.remotePath);
    }
    if (row.object.provider === "terabox" && row.object.remotePath) {
      const remote = await getTeraBoxFileMetadata(row.account, row.object.remotePath, false).catch(() => null);
      if (remote?.metadata) await deleteTeraBoxFile(row.account, row.object.remotePath);
    }
    await db.delete(logicalFiles).where(and(eq(logicalFiles.id, row.file.id), eq(logicalFiles.userId, userId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Provider upload abort failed", error);
    return NextResponse.json({ error: "provider_upload_abort_failed" }, { status: 500 });
  }
}
