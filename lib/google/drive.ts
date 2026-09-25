export type DriveAbout = {
  user?: { displayName?: string; emailAddress?: string; photoLink?: string };
  storageQuota?: { limit?: string; usage?: string; usageInDrive?: string; usageInDriveTrash?: string };
};
export type DriveIndexedFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  sha256Checksum?: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  trashed?: boolean;
  appProperties?: Record<string, string>;
};
export type DriveChange = { fileId: string; removed?: boolean; file?: DriveIndexedFile };

const auth = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
const INDEX_FIELDS = "id,name,mimeType,size,sha256Checksum,parents,createdTime,modifiedTime,webViewLink,trashed,appProperties";

export async function getDriveAbout(accessToken: string) {
  const fields = "user(displayName,emailAddress,photoLink),storageQuota(limit,usage,usageInDrive,usageInDriveTrash)";
  const response = await fetch(`https://www.googleapis.com/drive/v3/about?fields=${encodeURIComponent(fields)}`, { headers: auth(accessToken), cache: "no-store" });
  if (!response.ok) throw new Error(`Drive quota request failed (${response.status})`);
  return response.json() as Promise<DriveAbout>;
}

export async function getDriveRootId(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files/root?fields=id&supportsAllDrives=true", { headers: auth(accessToken), cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to resolve Drive root (${response.status})`);
  return ((await response.json()) as { id: string }).id;
}

export async function listAllDriveFiles(accessToken: string) {
  const files: DriveIndexedFile[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 500; page++) {
    const params = new URLSearchParams({
      q: "trashed=false",
      spaces: "drive",
      corpora: "user",
      pageSize: "1000",
      orderBy: "folder,name",
      fields: `nextPageToken,files(${INDEX_FIELDS})`,
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, { headers: auth(accessToken), cache: "no-store" });
    if (!response.ok) throw new Error(`Drive index listing failed (${response.status})`);
    const data = (await response.json()) as { nextPageToken?: string; files?: DriveIndexedFile[] };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) return files;
  }
  throw new Error("Drive index exceeded the safety page limit");
}

export async function getDriveStartPageToken(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/drive/v3/changes/startPageToken?spaces=drive&supportsAllDrives=true", { headers: auth(accessToken), cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to create Drive change cursor (${response.status})`);
  return ((await response.json()) as { startPageToken: string }).startPageToken;
}

export async function listDriveChanges(accessToken: string, startPageToken: string) {
  const changes: DriveChange[] = [];
  let pageToken = startPageToken;
  let newStartPageToken: string | undefined;
  for (let page = 0; page < 500; page++) {
    const params = new URLSearchParams({
      pageToken,
      spaces: "drive",
      pageSize: "1000",
      includeRemoved: "true",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
      fields: `nextPageToken,newStartPageToken,changes(fileId,removed,file(${INDEX_FIELDS}))`,
    });
    const response = await fetch(`https://www.googleapis.com/drive/v3/changes?${params.toString()}`, { headers: auth(accessToken), cache: "no-store" });
    if (response.status === 410) return { expired: true as const, changes: [], newStartPageToken: null };
    if (!response.ok) throw new Error(`Drive change sync failed (${response.status})`);
    const data = (await response.json()) as { nextPageToken?: string; newStartPageToken?: string; changes?: DriveChange[] };
    changes.push(...(data.changes ?? []));
    if (data.newStartPageToken) newStartPageToken = data.newStartPageToken;
    if (!data.nextPageToken) return { expired: false as const, changes, newStartPageToken: newStartPageToken ?? pageToken };
    pageToken = data.nextPageToken;
  }
  throw new Error("Drive change feed exceeded the safety page limit");
}

export async function ensureMeshlyFolder(accessToken: string) {
  const q = "name='Meshly Storage' and mimeType='application/vnd.google-apps.folder' and trashed=false";
  const list = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name)&pageSize=10`, { headers: auth(accessToken), cache: "no-store" });
  if (!list.ok) throw new Error("Unable to inspect Meshly storage folder");
  const existing = (await list.json()) as { files?: { id: string }[] };
  if (existing.files?.[0]?.id) return existing.files[0].id;
  const create = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { ...auth(accessToken), "content-type": "application/json" },
    body: JSON.stringify({ name: "Meshly Storage", mimeType: "application/vnd.google-apps.folder", appProperties: { meshly: "storage-root" } }),
  });
  if (!create.ok) throw new Error("Unable to create Meshly storage folder");
  return ((await create.json()) as { id: string }).id;
}

export async function createResumableSession(accessToken: string, input: { name: string; size: number; mimeType: string; parentId: string; appProperties?: Record<string, string> }) {
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size", {
    method: "POST",
    headers: {
      ...auth(accessToken),
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": input.mimeType,
      "x-upload-content-length": String(input.size),
    },
    body: JSON.stringify({ name: input.name, parents: [input.parentId], mimeType: input.mimeType, appProperties: input.appProperties ?? {} }),
  });
  if (!response.ok) throw new Error(`Unable to start Drive upload (${response.status})`);
  const url = response.headers.get("location");
  if (!url) throw new Error("Drive did not return a resumable session URL");
  return url;
}

export async function getDriveFileMetadata(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,size,md5Checksum,sha256Checksum,trashed,appProperties`, { headers: auth(accessToken), cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to verify Drive file (${response.status})`);
  return response.json() as Promise<{ id: string; name: string; size?: string; md5Checksum?: string; sha256Checksum?: string; trashed?: boolean; appProperties?: Record<string, string> }>;
}

export async function downloadDriveFile(accessToken: string, fileId: string, range?: string) {
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { ...auth(accessToken), ...(range ? { range } : {}) },
    cache: "no-store",
  });
}

export async function exportDriveFile(accessToken: string, fileId: string, mimeType: string) {
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(mimeType)}`, { headers: auth(accessToken), cache: "no-store" });
}

export async function deleteDriveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, { method: "DELETE", headers: auth(accessToken), cache: "no-store" });
  if (!response.ok && response.status !== 404) throw new Error(`Unable to delete Drive file (${response.status})`);
}

export async function findAppDataFile(accessToken: string, name: string) {
  const q = `name='${name.replaceAll("'", "\\'")}' and trashed=false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&pageSize=10`, { headers: auth(accessToken), cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to inspect appDataFolder (${response.status})`);
  const data = (await response.json()) as { files?: { id: string; name: string; modifiedTime?: string }[] };
  return data.files?.[0] ?? null;
}

export async function readAppDataFile(accessToken: string, name: string) {
  const file = await findAppDataFile(accessToken, name);
  if (!file) return null;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, { headers: auth(accessToken), cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to read appData file (${response.status})`);
  return { id: file.id, modifiedTime: file.modifiedTime ?? null, content: await response.text() };
}

export async function upsertAppDataFile(accessToken: string, name: string, content: string) {
  let existing = await findAppDataFile(accessToken, name);
  if (!existing) {
    const created = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST",
      headers: { ...auth(accessToken), "content-type": "application/json" },
      body: JSON.stringify({ name, parents: ["appDataFolder"], mimeType: "application/json" }),
      cache: "no-store",
    });
    if (!created.ok) throw new Error(`Unable to create appData file (${created.status})`);
    existing = (await created.json()) as { id: string; name: string };
  }
  const upload = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=media`, {
    method: "PATCH",
    headers: { ...auth(accessToken), "content-type": "application/json; charset=UTF-8" },
    body: content,
    cache: "no-store",
  });
  if (!upload.ok) throw new Error(`Unable to update appData file (${upload.status})`);
  return existing.id;
}
