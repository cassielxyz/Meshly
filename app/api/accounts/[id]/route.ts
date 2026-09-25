import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { chunks, linkedAccounts, logicalFiles } from "@/db/schema";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

const schema = z.object({
  priority: z.number().int().min(1).max(1000).optional(),
  uploadsEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const account = (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.id, id), eq(linkedAccounts.userId, userId))).limit(1))[0];
    if (!account) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await db.update(linkedAccounts).set({
      priority: input.priority ?? account.priority,
      status: input.uploadsEnabled === undefined ? account.status : input.uploadsEnabled ? "healthy" : "paused",
      updatedAt: new Date(),
    }).where(eq(linkedAccounts.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const db = getDb();
    const account = (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.id, id), eq(linkedAccounts.userId, userId))).limit(1))[0];
    if (!account) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const inUse = (await db.select({ id: chunks.id }).from(chunks).where(eq(chunks.accountId, id)).limit(1))[0];
    if (inUse) return NextResponse.json({
      error: "account_contains_meshly_chunks",
      message: "Move or permanently delete files stored on this account before disconnecting it.",
    }, { status: 409 });

    await db.transaction(async (tx) => {
      await tx.delete(logicalFiles).where(and(
        eq(logicalFiles.userId, userId),
        eq(logicalFiles.sourceKind, "external"),
        eq(logicalFiles.sourceAccountId, id),
      ));
      await tx.delete(linkedAccounts).where(and(eq(linkedAccounts.id, id), eq(linkedAccounts.userId, userId)));
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Account disconnect failed", error);
    return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });
  }
}
