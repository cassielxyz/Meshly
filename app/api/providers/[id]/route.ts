import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const db = getDb();
    const account = (await db.select({ id: providerAccounts.id }).from(providerAccounts).where(and(
      eq(providerAccounts.id, id),
      eq(providerAccounts.userId, userId),
    )).limit(1))[0];
    if (!account) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const inUse = (await db.select({ id: providerObjects.id }).from(providerObjects).where(eq(providerObjects.providerAccountId, id)).limit(1))[0];
    if (inUse) return NextResponse.json({
      error: "provider_account_contains_meshly_objects",
      message: "Move or permanently delete Meshly-managed files stored on this provider before disconnecting it.",
    }, { status: 409 });
    await db.delete(providerAccounts).where(and(eq(providerAccounts.id, id), eq(providerAccounts.userId, userId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Provider disconnect failed", error);
    return NextResponse.json({ error: "provider_disconnect_failed" }, { status: 500 });
  }
}
