import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { providerAccounts } from "@/db/provider-schema";
import { exchangeTeraBoxCode, getTeraBoxQuota, getTeraBoxTokenInfo, getTeraBoxUser } from "@/lib/providers/terabox";
import { encryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

const schema = z.object({ code: z.string().trim().min(1).max(2048) });

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const { code } = schema.parse(await request.json());
    const token = await exchangeTeraBoxCode(code);
    const info = await getTeraBoxTokenInfo(token.access_token);
    const [profile, quota] = await Promise.all([
      getTeraBoxUser(token.access_token, info.api_domain),
      getTeraBoxQuota(token.access_token, info.api_domain),
    ]);
    const db = getDb();
    const externalAccountId = String(info.user_id);
    const globallyLinked = (await db.select().from(providerAccounts).where(and(
      eq(providerAccounts.provider, "terabox"),
      eq(providerAccounts.externalAccountId, externalAccountId),
    )).limit(1))[0];
    if (globallyLinked && globallyLinked.userId !== userId) {
      return NextResponse.json({ error: "terabox_account_already_linked" }, { status: 409 });
    }

    const quotaLimit = Number.isSafeInteger(Number(quota.total)) ? Number(quota.total) : 0;
    const quotaUsage = Number.isSafeInteger(Number(quota.used)) ? Number(quota.used) : 0;
    const values = {
      userId,
      provider: "terabox",
      externalAccountId,
      name: profile.uname ?? null,
      avatarUrl: profile.avatar_url ?? null,
      accessTokenEncrypted: encryptSecret(token.access_token),
      refreshTokenEncrypted: encryptSecret(token.refresh_token),
      tokenExpiresAt: new Date(Date.now() + Math.max(60, token.expires_in) * 1000),
      quotaLimit,
      quotaUsage,
      status: "healthy",
      metadata: {
        apiDomain: info.api_domain,
        uploadDomain: info.upload_domain ?? null,
        vipType: profile.vip_type ?? null,
      },
      updatedAt: new Date(),
    };

    const id = globallyLinked?.id ?? nanoid();
    if (globallyLinked) await db.update(providerAccounts).set(values).where(eq(providerAccounts.id, id));
    else await db.insert(providerAccounts).values({ id, ...values });

    return NextResponse.json({ ok: true, accountId: id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    console.error("TeraBox OAuth exchange failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "terabox_connect_failed" }, { status: 502 });
  }
}
