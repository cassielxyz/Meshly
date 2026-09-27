import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts } from "@/db/provider-schema";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

const TERABOX_AUTH_ORIGIN = "https://www.terabox.com";
const TERABOX_UPLOAD_APP_ID = "250528";
export const TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES = 3 * 1024 * 1024;

export type TeraBoxAccount = typeof providerAccounts.$inferSelect;

type TeraBoxTokenPayload = {
  errno: number;
  data?: { access_token: string; refresh_token: string; expires_in: number };
  show_msg?: string;
};

type TeraBoxTokenInfo = {
  errno: number;
  data?: { client_id: string; api_domain: string; upload_domain?: string; expires_in: number; create_time: number; user_id: number };
  show_msg?: string;
};

type TeraBoxUser = {
  errno: number;
  uk: number;
  uname?: string;
  avatar_url?: string;
  vip_type?: number;
};

type TeraBoxQuota = { errno: number; total: number; used: number };

type TeraBoxPrecreate = {
  errno: number;
  path?: string;
  uploadid?: string;
  return_type?: number;
  block_list?: number[];
};

type TeraBoxCreatedFile = {
  errno: number;
  fs_id?: number;
  path?: string;
  size?: number;
  md5?: string;
  server_filename?: string;
};

type TeraBoxFileMeta = {
  fs_id: number | string;
  size: number;
  md5?: string;
  filename?: string;
  server_filename?: string;
  path?: string;
};

type TeraBoxMetasPayload = {
  errno: number;
  info?: TeraBoxFileMeta[];
  dlink?: { fs_id: string; dlink: string }[];
};

export type TeraBoxEntry = {
  fs_id: number;
  server_filename: string;
  path: string;
  size: number;
  isdir: number;
  md5?: string;
  server_mtime?: number;
  server_ctime?: number;
};

function config() {
  const clientId = process.env.TERABOX_CLIENT_ID;
  const clientSecret = process.env.TERABOX_CLIENT_SECRET;
  const privateSecret = process.env.TERABOX_PRIVATE_SECRET;
  if (!clientId || !clientSecret || !privateSecret) throw new Error("TeraBox is not configured");
  return { clientId, clientSecret, privateSecret };
}

function managedRoot() {
  const root = process.env.TERABOX_APP_ROOT?.trim();
  if (!root) throw new Error("TeraBox managed app root is not configured");
  return root.startsWith("/") ? root.replace(/\/$/, "") : `/${root.replace(/\/$/, "")}`;
}

export function isTeraBoxConfigured() {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

export function isTeraBoxManagedUploadsEnabled() {
  if (process.env.TERABOX_MANAGED_UPLOADS_ENABLED !== "true") return false;
  try {
    config();
    managedRoot();
    return true;
  } catch {
    return false;
  }
}

export function getTeraBoxAuthorizationUrl() {
  const { clientId } = config();
  return `${TERABOX_AUTH_ORIGIN}/wap/outside/login?clientId=${encodeURIComponent(clientId)}`;
}

export function getTeraBoxManagedPath(physicalName: string) {
  if (!/^msh_[A-Za-z0-9_-]+\.bin$/.test(physicalName)) throw new Error("Invalid TeraBox physical object name");
  return `${managedRoot()}/Meshly Storage/${physicalName}`;
}

function signature(timestamp: number) {
  const { clientId, clientSecret, privateSecret } = config();
  return createHash("md5").update(`${clientId}_${timestamp}_${clientSecret}_${privateSecret}`).digest("hex");
}

async function postToken(path: "/oauth/gettoken" | "/oauth/refreshtoken", extra: Record<string, string>) {
  const { clientId, clientSecret } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const form = new FormData();
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("timestamp", String(timestamp));
  form.set("sign", signature(timestamp));
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  const response = await fetch(`${TERABOX_AUTH_ORIGIN}${path}`, { method: "POST", body: form, cache: "no-store" });
  if (!response.ok) throw new Error(`TeraBox token request failed (${response.status})`);
  const payload = await response.json() as TeraBoxTokenPayload;
  if (payload.errno !== 0 || !payload.data) throw new Error(`TeraBox token request failed (${payload.errno})`);
  return payload.data;
}

export function exchangeTeraBoxCode(code: string) {
  return postToken("/oauth/gettoken", { grant_type: "authorization_code", code });
}

export function refreshTeraBoxToken(refreshToken: string) {
  return postToken("/oauth/refreshtoken", { refresh_token: refreshToken });
}

export async function getTeraBoxTokenInfo(accessToken: string) {
  const form = new FormData();
  form.set("access_token", accessToken);
  const response = await fetch(`${TERABOX_AUTH_ORIGIN}/oauth/tokeninfo`, { method: "POST", body: form, cache: "no-store" });
  if (!response.ok) throw new Error(`TeraBox token info failed (${response.status})`);
  const payload = await response.json() as TeraBoxTokenInfo;
  if (payload.errno !== 0 || !payload.data) throw new Error(`TeraBox token info failed (${payload.errno})`);
  return payload.data;
}

function apiBase(domain: string) {
  return domain.startsWith("http://") || domain.startsWith("https://") ? domain.replace(/\/$/, "") : `https://${domain.replace(/\/$/, "")}`;
}

async function apiGet<T>(domain: string, path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`${apiBase(domain)}${path}`);
  url.searchParams.set("access_tokens", accessToken);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`TeraBox API ${path} failed (${response.status})`);
  const payload = await response.json() as T & { errno?: number };
  if (typeof payload.errno === "number" && payload.errno !== 0) throw new Error(`TeraBox API ${path} failed (${payload.errno})`);
  return payload;
}

async function apiPost<T>(domain: string, path: string, accessToken: string, fields: Record<string, string>, params: Record<string, string> = {}) {
  const url = new URL(`${apiBase(domain)}${path}`);
  url.searchParams.set("access_tokens", accessToken);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const response = await fetch(url, { method: "POST", body: form, cache: "no-store" });
  if (!response.ok) throw new Error(`TeraBox API ${path} failed (${response.status})`);
  const payload = await response.json() as T & { errno?: number };
  if (typeof payload.errno === "number" && payload.errno !== 0) throw new Error(`TeraBox API ${path} failed (${payload.errno})`);
  return payload;
}

export function getTeraBoxUser(accessToken: string, apiDomain: string) {
  return apiGet<TeraBoxUser>(apiDomain, "/openapi/uinfo", accessToken);
}

export function getTeraBoxQuota(accessToken: string, apiDomain: string) {
  return apiGet<TeraBoxQuota>(apiDomain, "/openapi/api/quota", accessToken);
}

export async function getTeraBoxAccessToken(account: TeraBoxAccount) {
  const now = Date.now();
  if (account.accessTokenEncrypted && account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now > 60_000) {
    return decryptSecret(account.accessTokenEncrypted);
  }
  if (!account.refreshTokenEncrypted) throw new Error("TeraBox account needs reauthorization");
  const refreshed = await refreshTeraBoxToken(decryptSecret(account.refreshTokenEncrypted));
  const expiresAt = new Date(now + Math.max(60, refreshed.expires_in) * 1000);
  await getDb().update(providerAccounts).set({
    accessTokenEncrypted: encryptSecret(refreshed.access_token),
    refreshTokenEncrypted: encryptSecret(refreshed.refresh_token),
    tokenExpiresAt: expiresAt,
    status: "healthy",
    updatedAt: new Date(),
  }).where(eq(providerAccounts.id, account.id));
  return refreshed.access_token;
}

async function transferContext(account: TeraBoxAccount) {
  const accessToken = await getTeraBoxAccessToken(account);
  const metadata = account.metadata as { apiDomain?: string; uploadDomain?: string | null };
  let apiDomain = metadata.apiDomain;
  let uploadDomain = metadata.uploadDomain ?? undefined;
  if (!apiDomain || !uploadDomain) {
    const info = await getTeraBoxTokenInfo(accessToken);
    apiDomain = info.api_domain;
    uploadDomain = info.upload_domain;
  }
  if (!apiDomain) throw new Error("TeraBox API domain is unavailable");
  return { accessToken, apiDomain, uploadDomain };
}

export async function refreshTeraBoxAccount(account: TeraBoxAccount) {
  const db = getDb();
  try {
    const accessToken = await getTeraBoxAccessToken(account);
    const info = await getTeraBoxTokenInfo(accessToken);
    const [profile, quota] = await Promise.all([
      getTeraBoxUser(accessToken, info.api_domain),
      getTeraBoxQuota(accessToken, info.api_domain),
    ]);
    const quotaLimit = Number.isSafeInteger(Number(quota.total)) ? Number(quota.total) : 0;
    const quotaUsage = Number.isSafeInteger(Number(quota.used)) ? Number(quota.used) : 0;
    await db.update(providerAccounts).set({
      externalAccountId: String(info.user_id),
      name: profile.uname ?? account.name,
      avatarUrl: profile.avatar_url ?? account.avatarUrl,
      quotaLimit,
      quotaUsage,
      status: "healthy",
      metadata: { ...account.metadata, apiDomain: info.api_domain, uploadDomain: info.upload_domain ?? null, vipType: profile.vip_type ?? null },
      updatedAt: new Date(),
    }).where(eq(providerAccounts.id, account.id));
    return { ok: true as const, quotaLimit, quotaUsage };
  } catch (error) {
    const message = error instanceof Error ? error.message : "TeraBox refresh failed";
    await db.update(providerAccounts).set({ status: "needs_reauth", metadata: { ...account.metadata, lastError: message }, updatedAt: new Date() }).where(eq(providerAccounts.id, account.id));
    return { ok: false as const, error: message };
  }
}

export async function listTeraBoxFolder(account: TeraBoxAccount, dir: string, page = 1, num = 100) {
  const { accessToken, apiDomain } = await transferContext(account);
  return apiGet<{ info?: TeraBoxEntry[]; list?: TeraBoxEntry[]; has_more?: number }>(apiDomain, "/openapi/api/list", accessToken, {
    dir,
    page: String(Math.max(1, page)),
    num: String(Math.max(1, Math.min(1000, num))),
    order: "time",
    desc: "1",
    web: "1",
  });
}

export async function precreateTeraBoxUpload(account: TeraBoxAccount, path: string, blockMd5: string[]) {
  const { accessToken, apiDomain } = await transferContext(account);
  const result = await apiPost<TeraBoxPrecreate>(apiDomain, "/openapi/api/precreate", accessToken, {
    autoinit: "1",
    path,
    block_list: JSON.stringify(blockMd5),
  });
  if (!result.uploadid && result.return_type !== 2) throw new Error("TeraBox precreate did not return an upload id");
  return result;
}

export async function uploadTeraBoxShard(account: TeraBoxAccount, input: { path: string; uploadId: string; part: number; bytes: Uint8Array }) {
  const { accessToken, uploadDomain } = await transferContext(account);
  if (!uploadDomain) throw new Error("TeraBox upload domain is unavailable");
  const url = new URL(`${apiBase(uploadDomain)}/rest/2.0/pcs/superfile2`);
  url.searchParams.set("method", "upload");
  url.searchParams.set("app_id", TERABOX_UPLOAD_APP_ID);
  url.searchParams.set("path", input.path);
  url.searchParams.set("uploadid", input.uploadId);
  url.searchParams.set("partseq", String(input.part));
  url.searchParams.set("access_tokens", accessToken);
  const body = input.bytes.buffer.slice(input.bytes.byteOffset, input.bytes.byteOffset + input.bytes.byteLength) as ArrayBuffer;
  const form = new FormData();
  form.set("file", new Blob([body]), `part-${input.part}.bin`);
  const response = await fetch(url, { method: "POST", body: form, cache: "no-store" });
  if (!response.ok) throw new Error(`TeraBox shard upload failed (${response.status})`);
  const payload = await response.json() as { errno?: number; md5?: string; uploadid?: string; partseq?: number };
  if (typeof payload.errno === "number" && payload.errno !== 0) throw new Error(`TeraBox shard upload failed (${payload.errno})`);
  if (!payload.md5) throw new Error("TeraBox shard upload did not return an MD5");
  return payload;
}

export async function createTeraBoxFile(account: TeraBoxAccount, input: { path: string; size: number; uploadId: string; blockMd5: string[] }) {
  const { accessToken, apiDomain } = await transferContext(account);
  return apiPost<TeraBoxCreatedFile>(apiDomain, "/openapi/api/create", accessToken, {
    path: input.path,
    size: String(input.size),
    uploadid: input.uploadId,
    block_list: JSON.stringify(input.blockMd5),
    rtype: "1",
  });
}

export async function getTeraBoxFileMetadata(account: TeraBoxAccount, path: string, includeDownload = false) {
  const { accessToken, apiDomain } = await transferContext(account);
  const result = await apiGet<TeraBoxMetasPayload>(apiDomain, "/openapi/api/filemetas", accessToken, {
    target: JSON.stringify([path]),
    dlink: includeDownload ? "1" : "0",
  });
  return { metadata: result.info?.[0] ?? null, dlink: result.dlink?.[0]?.dlink ?? null, accessToken };
}

export async function downloadTeraBoxFile(account: TeraBoxAccount, path: string, range?: string) {
  const { dlink, accessToken } = await getTeraBoxFileMetadata(account, path, true);
  if (!dlink) throw new Error("TeraBox did not return a download link");
  const url = new URL(dlink);
  url.searchParams.set("access_tokens", accessToken);
  return fetch(url, { headers: range ? { range } : undefined, cache: "no-store", redirect: "follow" });
}

export async function deleteTeraBoxFile(account: TeraBoxAccount, path: string) {
  const { accessToken, apiDomain } = await transferContext(account);
  return apiPost<{ errno: number; info?: { errno: number; path: string }[] }>(apiDomain, "/openapi/api/filemanager", accessToken, {
    filelist: JSON.stringify([path]),
  }, { opera: "delete", async: "0" });
}
