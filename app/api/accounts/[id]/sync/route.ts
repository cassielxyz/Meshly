import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireRequestUser } from "@/lib/server/auth";
import { fullIndexDriveAccount, syncDriveAccountChanges } from "@/lib/google/full-sync";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const initial = request.nextUrl.searchParams.get("initial") === "1";
    const result = initial ? await fullIndexDriveAccount(userId, id) : await syncDriveAccountChanges(userId, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const message = error instanceof Error ? error.message : "drive_sync_failed";
    console.error("Full Drive sync failed", error);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
