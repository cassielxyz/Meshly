import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts } from "@/db/provider-schema";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

const DROPBOX_API = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT = "https://content.dropboxapi.com/2";
const DROPBOX_AUTH = "https://www.dropbox.com/oauth2/authorize";
const DROPBOX_TOKEN = "https://api.dropboxapi.com/oauth2/token";

export type DropboxAccount = typeof providerAccounts.$inferSelect;

type DropboxTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  account_id?: string;
  token_type: string;
  scope?: string;
};

type DropboxProfile = {
  account_id: string;
  email?: string;
  name?: { display_name?: string };
  profile_photo_url?: string;
};

type DropboxSpaceUsage = {
  used: number;
  allocation: { ".tag": string; allocated?: number };
};

export type DropboxEntry = {
  ".tag": "file" | "folder" | "deleted";
  id?: string;
  name: string;
  path_lower?: string;
  path_display?: string;
  size?: number;
  client_modified?: string;
  server_modified?: string;
  content_hash?: string;
};

function config() {
  const clientId = process.env.DROPBOX_CLIENT_ID;
  const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const redirectUri = process.env.DROPBOX_REDIRECT_URI ?? (appUrl ? `${appUrl}/api/auth/dropbox/callback` : undefined);
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Dropbox is not configured");
  return { clientId, clientSecret, redirectUri };
}

export function isDropboxConfigured() {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

export function buildDropboxAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = config();
  const url = new URL(DROPBOX_AUTH);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    token_access_type: "offline",
    scope: "account_info.read files.metadata.read files.content.read files.content.write",
    state,
  }).toString();
  return url.toString();
}

async function tokenRequest(parameters: Record<string, string>) {
  const { clientId, clientSecret, redirectUri } = config();
  const response = await fetch(DROPBOX_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, ...parameters }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Dropbox token request failed (${response.status})`);
  return response.json() as Promise<DropboxTokenResponse>;
}

export function exchangeDropboxCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code" });
}

export function refreshDropboxToken(refreshToken: string) {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

async function rpc<T>(accessToken: string, path: string, body: unknown = null) {
  const response = await fetch(`${DROPBOX_API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: body === null ? "null" : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Dropbox API ${path} failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function getDropboxProfile(accessToken: string) {
  return rpc<DropboxProfile>(accessToken, "/users/get_current_account");
}

export function getDropboxSpaceUsage(accessToken: string) {
  return rpc<DropboxSpaceUsage>(accessToken, "/users/get_space_usage");
}

export async function getDropboxAccessToken(account: DropboxAccount) {
  const now = Date.now();
  if (account.accessTokenEncrypted && account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now > 60_000) {
    return decryptSecret(account.accessTokenEncrypted);
  }
  if (!account.refreshTokenEncrypted) throw new Error("Dropbox account needs reauthorization");
  const refreshed = await refreshDropboxToken(decryptSecret(account.refreshTokenEncrypted));
  const expiresAt = new Date(now + Math.max(60, refreshed.expires_in ?? 14_400) * 1000);
  await getDb().update(providerAccounts).set({
    accessTokenEncrypted: encryptSecret(refreshed.access_token),
    tokenExpiresAt: expiresAt,
    status: "healthy",
    updatedAt: new Date(),
  }).where(eq(providerAccounts.id, account.id));
  return refreshed.access_token;
}

export async function refreshDropboxAccount(account: DropboxAccount) {
  const db = getDb();
  try {
    const accessToken = await getDropboxAccessToken(account);
    const [profile, usage] = await Promise.all([getDropboxProfile(accessToken), getDropboxSpaceUsage(accessToken)]);
    const quotaUsage = Number.isSafeInteger(usage.used) ? usage.used : 0;
    const allocated = Number(usage.allocation?.allocated ?? 0);
    const quotaLimit = Number.isSafeInteger(allocated) ? allocated : 0;
    await db.update(providerAccounts).set({
      externalAccountId: profile.account_id,
      email: profile.email ?? account.email,
      name: profile.name?.display_name ?? account.name,
      avatarUrl: profile.profile_photo_url ?? account.avatarUrl,
      quotaLimit,
      quotaUsage,
      status: "healthy",
      updatedAt: new Date(),
    }).where(eq(providerAccounts.id, account.id));
    return { ok: true as const, quotaLimit, quotaUsage };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dropbox refresh failed";
    await db.update(providerAccounts).set({ status: "needs_reauth", metadata: { ...account.metadata, lastError: message }, updatedAt: new Date() }).where(eq(providerAccounts.id, account.id));
    return { ok: false as const, error: message };
  }
}

export async function listDropboxFolder(accessToken: string, path = "") {
  const entries: DropboxEntry[] = [];
  let page = await rpc<{ entries: DropboxEntry[]; cursor: string; has_more: boolean }>(accessToken, "/files/list_folder", {
    path,
    recursive: false,
    include_deleted: false,
    include_mounted_folders: true,
    include_non_downloadable_files: true,
    limit: 1000,
  });
  entries.push(...page.entries);
  for (let safety = 0; page.has_more && safety < 100; safety++) {
    page = await rpc<{ entries: DropboxEntry[]; cursor: string; has_more: boolean }>(accessToken, "/files/list_folder/continue", { cursor: page.cursor });
    entries.push(...page.entries);
  }
  return entries;
}

export async function downloadDropboxFile(accessToken: string, path: string) {
  return fetch(`${DROPBOX_CONTENT}/files/download`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "dropbox-api-arg": JSON.stringify({ path }) },
    cache: "no-store",
  });
}
