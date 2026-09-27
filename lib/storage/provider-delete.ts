import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { deleteDropboxPath, getDropboxAccessToken, tryGetDropboxMetadata } from "@/lib/providers/dropbox";

export async function deleteManagedProviderObjects(userId: string, fileIds: string[]) {
  if (!fileIds.length) return { deleted: 0 };
  const db = getDb();
  const rows = await db.select({ object: providerObjects, account: providerAccounts })
    .from(providerObjects)
    .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
    .where(and(inArray(providerObjects.fileId, fileIds), eq(providerAccounts.userId, userId)));
  const dropboxTokens = new Map<string, string>();
  let deleted = 0;

  for (const { object, account } of rows) {
    if (object.provider !== account.provider) throw new Error("Provider object binding is invalid");
    if (object.provider === "dropbox") {
      if (!object.remotePath) continue;
      let access = dropboxTokens.get(account.id);
      if (!access) {
        access = await getDropboxAccessToken(account);
        dropboxTokens.set(account.id, access);
      }
      const remote = await tryGetDropboxMetadata(access, object.remotePath);
      if (remote) await deleteDropboxPath(access, object.remotePath);
      deleted++;
      continue;
    }
    if (object.status === "ready") throw new Error(`Permanent delete is not implemented for provider ${object.provider}`);
  }
  return { deleted };
}
