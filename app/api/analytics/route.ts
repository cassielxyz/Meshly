import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { activities, linkedAccounts, logicalFiles, shares } from "@/db/schema";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const db = getDb();
    const [files, accounts, recentActivity, shareRows] = await Promise.all([
      db.select({ id: logicalFiles.id, kind: logicalFiles.mimeType, size: logicalFiles.size, status: logicalFiles.status, sourceKind: logicalFiles.sourceKind, trashedAt: logicalFiles.trashedAt }).from(logicalFiles).where(eq(logicalFiles.userId, userId)).limit(5000),
      db.select({ id: linkedAccounts.id, quotaLimit: linkedAccounts.quotaLimit, quotaUsage: linkedAccounts.quotaUsage, status: linkedAccounts.status }).from(linkedAccounts).where(eq(linkedAccounts.userId, userId)),
      db.select({ kind: activities.kind, createdAt: activities.createdAt }).from(activities).where(eq(activities.userId, userId)).orderBy(desc(activities.createdAt)).limit(1000),
      db.select({ downloadCount: shares.downloadCount, revokedAt: shares.revokedAt, expiresAt: shares.expiresAt }).from(shares).where(eq(shares.userId, userId)).limit(1000),
    ]);

    const activeFiles = files.filter((file) => !file.trashedAt);
    const realFiles = activeFiles.filter((file) => file.kind !== "application/vnd.meshly.folder");
    const now = Date.now();
    const last30 = recentActivity.filter((activity) => now - activity.createdAt.getTime() <= 30 * DAY);
    const activeShares = shareRows.filter((share) => !share.revokedAt && (!share.expiresAt || share.expiresAt.getTime() > now));

    const totalCapacity = accounts.reduce((sum, account) => sum + account.quotaLimit, 0);
    const totalUsage = accounts.reduce((sum, account) => sum + account.quotaUsage, 0);

    return NextResponse.json({
      files: {
        total: realFiles.length,
        folders: activeFiles.length - realFiles.length,
        bytes: realFiles.reduce((sum, file) => sum + file.size, 0),
        managed: realFiles.filter((file) => file.sourceKind === "managed").length,
        external: realFiles.filter((file) => file.sourceKind === "external").length,
        ready: realFiles.filter((file) => file.status === "ready").length,
        degraded: realFiles.filter((file) => !["ready", "external"].includes(file.status)).length,
        images: realFiles.filter((file) => file.kind.startsWith("image/")).length,
        archives: realFiles.filter((file) => /zip|archive|compressed/.test(file.kind)).length,
      },
      storage: {
        accounts: accounts.length,
        healthyAccounts: accounts.filter((account) => account.status === "healthy").length,
        total: totalCapacity,
        used: totalUsage,
        free: Math.max(0, totalCapacity - totalUsage),
      },
      activity: {
        total30d: last30.length,
        uploads30d: last30.filter((activity) => /upload/.test(activity.kind)).length,
        downloads30d: last30.filter((activity) => /download/.test(activity.kind)).length,
        syncs30d: last30.filter((activity) => /sync|index/.test(activity.kind)).length,
        warnings30d: last30.filter((activity) => /error|failed|degraded|integrity/.test(activity.kind)).length,
      },
      sharing: {
        active: activeShares.length,
        downloads: shareRows.reduce((sum, share) => sum + share.downloadCount, 0),
      },
      generatedAt: new Date().toISOString(),
      capped: files.length >= 5000 || recentActivity.length >= 1000 || shareRows.length >= 1000,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "analytics_failed" }, { status: 500 });
  }
}
