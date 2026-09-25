import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireRequestUser } from "@/lib/server/auth";
import { restoreRecoverySnapshot } from "@/lib/storage/recovery";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    return NextResponse.json(await restoreRecoverySnapshot(userId));
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const message = error instanceof Error ? error.message : "recovery_restore_failed";
    console.error("Recovery restore failed", error);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
