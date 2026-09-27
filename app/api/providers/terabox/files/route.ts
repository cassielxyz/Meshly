import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts } from "@/db/provider-schema";
import { listTeraBoxFolder } from "@/lib/providers/terabox";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const accountId = request.nextUrl.searchParams.get("accountId");
    const dir = request.nextUrl.searchParams.get("dir") ?? "/";
    const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
    if (!accountId) return NextResponse.json({ error: "account_required" }, { status: 400 });
    const account = (await getDb().select().from(providerAccounts).where(and(
      eq(providerAccounts.id, accountId),
      eq(providerAccounts.userId, userId),
      eq(providerAccounts.provider, "terabox"),
    )).limit(1))[0];
    if (!account) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const result = await listTeraBoxFolder(account, dir, Number.isFinite(page) ? page : 1, 100);
    const source = result.info ?? result.list ?? [];
    return NextResponse.json({
      accountId,
      dir,
      page,
      hasMore: result.has_more === 1,
      entries: source.map((entry) => ({
        id: String(entry.fs_id),
        kind: entry.isdir === 1 ? "folder" : "file",
        name: entry.server_filename,
        path: entry.path,
        size: Number(entry.size) || 0,
        modifiedAt: entry.server_mtime ? new Date(entry.server_mtime * 1000).toISOString() : null,
        md5: entry.md5 ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("TeraBox file listing failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "terabox_list_failed" }, { status: 502 });
  }
}
