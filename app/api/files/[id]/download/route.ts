import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { activities, logicalFiles } from "@/db/schema";
import { requireRequestUser, AuthError } from "@/lib/server/auth";
import { streamLogicalFile } from "@/lib/storage/download";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const db = getDb();
    const own = (await db.select({ id: logicalFiles.id, name: logicalFiles.name, size: logicalFiles.size }).from(logicalFiles).where(and(eq(logicalFiles.id, id), eq(logicalFiles.userId, userId))).limit(1))[0];
    if (!own) return new Response("Not found", { status: 404 });

    const response = await streamLogicalFile(id, request.headers.get("range"));
    if (response.status >= 200 && response.status < 400) {
      await db.insert(activities).values({
        id: nanoid(),
        userId,
        kind: "download_requested",
        subjectId: id,
        metadata: {
          name: own.name,
          size: own.size,
          ranged: Boolean(request.headers.get("range")),
          status: response.status,
        },
      }).catch(() => undefined);
    }
    return response;
  } catch (error) {
    if (error instanceof AuthError) return new Response("Unauthorized", { status: 401 });
    console.error("Download reconstruction failed", error);
    return new Response("Download failed", { status: 500 });
  }
}
