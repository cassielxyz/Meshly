import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, isNotNull, isNull, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { activities, logicalFiles } from "@/db/schema";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

const FOLDER = "application/vnd.meshly.folder";
const folderSchema = z.object({ name: z.string().trim().min(1).max(255), parentId: z.string().nullable().optional() });

type BreadcrumbRow = { id: string; parentId: string | null; name: string };

function dto(item: typeof logicalFiles.$inferSelect) {
  return {
    id: item.id,
    parentId: item.parentId,
    name: item.name,
    mimeType: item.mimeType,
    size: item.size,
    sha256: item.sha256,
    status: item.status,
    starred: item.starred === 1,
    description: item.description,
    version: item.version,
    trashedAt: item.trashedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    modifiedAt: item.updatedAt.toISOString(),
    kind: item.mimeType === FOLDER ? "folder" as const : "file" as const,
    sourceKind: item.sourceKind,
    sourceAccountId: item.sourceAccountId,
    sourceDriveFileId: item.sourceDriveFileId,
    sourceMimeType: item.sourceMimeType,
    sourceWebViewLink: item.sourceWebViewLink,
  };
}

async function validateParent(userId: string, parentId: string | null | undefined) {
  if (!parentId) return null;
  const db = getDb();
  const row = (await db.select().from(logicalFiles).where(and(eq(logicalFiles.id, parentId), eq(logicalFiles.userId, userId), eq(logicalFiles.mimeType, FOLDER), isNull(logicalFiles.trashedAt))).limit(1))[0];
  if (!row) throw new Error("Invalid parent folder");
  return row;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const db = getDb();
    const scope = request.nextUrl.searchParams.get("scope") ?? "folder";
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const parent = request.nextUrl.searchParams.get("parentId");
    const parentId = parent && parent !== "root" ? parent : null;
    const conditions: SQL[] = [eq(logicalFiles.userId, userId), eq(logicalFiles.status, "ready")];
    if (scope === "trash") conditions.push(isNotNull(logicalFiles.trashedAt));
    else conditions.push(isNull(logicalFiles.trashedAt));
    if (scope === "starred") conditions.push(eq(logicalFiles.starred, 1));
    if (q) conditions.push(ilike(logicalFiles.name, `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));
    if (scope === "folder" && !q) conditions.push(parentId ? eq(logicalFiles.parentId, parentId) : isNull(logicalFiles.parentId));
    const rows = await db.select().from(logicalFiles).where(and(...conditions)).orderBy(desc(logicalFiles.updatedAt)).limit(scope === "recent" || q ? 200 : 500);

    const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: "My Drive" }];
    if (parentId) {
      const chain: BreadcrumbRow[] = [];
      let cursor: string | null = parentId;
      for (let i = 0; i < 50 && cursor; i++) {
        const current: BreadcrumbRow | undefined = (await db.select({ id: logicalFiles.id, parentId: logicalFiles.parentId, name: logicalFiles.name }).from(logicalFiles).where(and(eq(logicalFiles.id, cursor), eq(logicalFiles.userId, userId))).limit(1))[0];
        if (!current) break;
        chain.unshift(current);
        cursor = current.parentId;
      }
      breadcrumbs.push(...chain.map((item) => ({ id: item.id, name: item.name })));
    }
    return NextResponse.json({ items: rows.map(dto), breadcrumbs });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Items list failed", error);
    return NextResponse.json({ error: "items_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const input = folderSchema.parse(await request.json());
    await validateParent(userId, input.parentId);
    const db = getDb();
    const parentCondition = input.parentId ? eq(logicalFiles.parentId, input.parentId) : isNull(logicalFiles.parentId);
    const duplicate = (await db.select({ id: logicalFiles.id }).from(logicalFiles).where(and(eq(logicalFiles.userId, userId), parentCondition, isNull(logicalFiles.trashedAt), ilike(logicalFiles.name, input.name))).limit(1))[0];
    if (duplicate) return NextResponse.json({ error: "name_conflict" }, { status: 409 });
    const id = nanoid();
    const now = new Date();
    await db.insert(logicalFiles).values({ id, userId, parentId: input.parentId ?? null, name: input.name, mimeType: FOLDER, size: 0, status: "ready", createdAt: now, updatedAt: now });
    await db.insert(activities).values({ id: nanoid(), userId, kind: "folder_created", subjectId: id, metadata: { name: input.name } });
    const item = (await db.select().from(logicalFiles).where(eq(logicalFiles.id, id)).limit(1))[0];
    return NextResponse.json({ item: item ? dto(item) : null }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
}
