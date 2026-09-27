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

export type DropboxUploadResult = DropboxEntry & {
  ".tag": "file";
  id: string;
  path_display: string;
  size: number;
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

export function isDropboxManagedUploadsEnabled() {
  return isDropboxConfigured() && process.env.DROPBOX_MANAGED_UPLOADS_ENABLED === "true";
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

async function contentRpc<T>(accessToken: string, path: string, arg: unknown, body: Uint8Array | ArrayBuffer | null) {
  const response = await fetch(`${DROPBOX_CONTENT}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/octet-stream",
      "dropbox-api-arg": JSON.stringify(arg),
    },
    body: body == null ? new Uint8Array(0) : body,
    cache: "no-store",
  });
  if (!response.ok) {
    let detail: unknown = null;
    try { detail = await response.json(); } catch { /* ignore non-json provider errors */ }
    const error = new Error(`Dropbox content API ${path} failed (${response.status})`) as Error & { status?: number; detail?: unknown };
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function findCorrectOffset(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.correct_offset === "number" && Number.isSafeInteger(record.correct_offset) && record.correct_offset >= 0) return record.correct_offset;
  for (const nested of Object.values(record)) {
    const found = findCorrectOffset(nested);
    if (found !== null) return found;
  }
  return null;
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

export function getDropboxMetadata(accessToken: string, path: string) {
  return rpc<DropboxEntry>(accessToken, "/files/get_metadata", { path, include_media_info: false, include_deleted: false });
}

export async function tryGetDropboxMetadata(accessToken: string, path: string) {
  try {
    return await getDropboxMetadata(accessToken, path);
  } catch (error) {
    if (error instanceof Error && /\(409\)/.test(error.message)) return null;
    throw error;
  }
}

export async function ensureDropboxFolder(accessToken: string, path: string) {
  const existing = await tryGetDropboxMetadata(accessToken, path);
  if (existing) {
    if (existing[".tag"] !== "folder") throw new Error(`Dropbox path ${path} exists but is not a folder`);
    return;
  }
  try {
    await rpc(accessToken, "/files/create_folder_v2", { path, autorename: false });
  } catch (error) {
    const afterConflict = await tryGetDropboxMetadata(accessToken, path);
    if (!afterConflict || afterConflict[".tag"] !== "folder") throw error;
  }
}

export async function startDropboxUploadSession(accessToken: string) {
  const result = await contentRpc<{ session_id: string }>(accessToken, "/files/upload_session/start", { close: false }, null);
  if (!result?.session_id) throw new Error("Dropbox did not return an upload session id");
  return result.session_id;
}

export async function appendDropboxUploadSession(accessToken: string, sessionId: string, offset: number, body: Uint8Array) {
  try {
    await contentRpc<void>(accessToken, "/files/upload_session/append_v2", { cursor: { session_id: sessionId, offset }, close: false }, body);
    return { acceptedOffset: offset + body.byteLength, reconciled: false as const };
  } catch (error) {
    const providerError = error as Error & { status?: number; detail?: unknown };
    if (providerError.status === 409) {
      const correctOffset = findCorrectOffset(providerError.detail);
      if (correctOffset !== null) return { acceptedOffset: correctOffset, reconciled: true as const };
    }
    throw error;
  }
}

export async function finishDropboxUploadSession(accessToken: string, sessionId: string, offset: number, path: string) {
  return contentRpc<DropboxUploadResult>(accessToken, "/files/upload_session/finish", {
    cursor: { session_id: sessionId, offset },
    commit: { path, mode: "add", autorename: false, mute: true, strict_conflict: true },
  }, null);
}

export function deleteDropboxPath(accessToken: string, path: string) {
  return rpc<{ metadata: DropboxEntry }>(accessToken, "/files/delete_v2", { path });
}

export async function downloadDropboxFile(accessToken: string, path: string, range?: string) {
  return fetch(`${DROPBOX_CONTENT}/files/download`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "dropbox-api-arg": JSON.stringify({ path }),
      ...(range ? { range } : {}),
    },
    cache: "no-store",
  });
}
