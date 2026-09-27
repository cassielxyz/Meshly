import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts } from "@/db/provider-schema";
import { getDropboxAccessToken, listDropboxFolder } from "@/lib/providers/dropbox";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const accountId = request.nextUrl.searchParams.get("accountId");
    const path = request.nextUrl.searchParams.get("path") ?? "";
    if (!accountId) return NextResponse.json({ error: "account_required" }, { status: 400 });
    const account = (await getDb().select().from(providerAccounts).where(and(
      eq(providerAccounts.id, accountId),
      eq(providerAccounts.userId, userId),
      eq(providerAccounts.provider, "dropbox"),
    )).limit(1))[0];
    if (!account) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const accessToken = await getDropboxAccessToken(account);
    const entries = await listDropboxFolder(accessToken, path);
    return NextResponse.json({
      accountId,
      path,
      entries: entries.filter((entry) => entry[".tag"] !== "deleted").map((entry) => ({
        id: entry.id ?? entry.path_lower ?? entry.name,
        kind: entry[".tag"],
        name: entry.name,
        path: entry.path_display ?? entry.path_lower ?? "",
        size: entry.size ?? 0,
        modifiedAt: entry.server_modified ?? entry.client_modified ?? null,
        contentHash: entry.content_hash ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Dropbox file listing failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "dropbox_list_failed" }, { status: 502 });
  }
}
