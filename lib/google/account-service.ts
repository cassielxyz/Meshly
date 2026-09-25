import { and,eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { linkedAccounts,syncState } from "@/db/schema";
import { getDriveAbout } from "./drive";
import { refreshGoogleAccessToken } from "./oauth";
import { decryptSecret } from "@/lib/security/crypto";

type Account=typeof linkedAccounts.$inferSelect;
export async function refreshAccountQuota(account:Account){const db=getDb();try{const access=await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));const about=await getDriveAbout(access);const limit=Number(about.storageQuota?.limit??0);const usage=Number(about.storageQuota?.usage??0);await db.update(linkedAccounts).set({quotaLimit:Number.isSafeInteger(limit)?limit:0,quotaUsage:Number.isSafeInteger(usage)?usage:0,status:"healthy",updatedAt:new Date()}).where(eq(linkedAccounts.id,account.id));await db.insert(syncState).values({accountId:account.id,lastQuotaRefresh:new Date(),lastError:null}).onConflictDoUpdate({target:syncState.accountId,set:{lastQuotaRefresh:new Date(),lastError:null,updatedAt:new Date()}});return{ok:true as const};}catch(error){const message=error instanceof Error?error.message:"quota refresh failed";const status=/\((400|401)\)/.test(message)?"needs_reauth":"error";await db.update(linkedAccounts).set({status,updatedAt:new Date()}).where(eq(linkedAccounts.id,account.id));await db.insert(syncState).values({accountId:account.id,lastError:message}).onConflictDoUpdate({target:syncState.accountId,set:{lastError:message,updatedAt:new Date()}});return{ok:false as const,error:message};}}
export async function refreshUserAccounts(userId:string){const db=getDb();const accounts=await db.select().from(linkedAccounts).where(eq(linkedAccounts.userId,userId));for(const account of accounts)await refreshAccountQuota(account);return db.select().from(linkedAccounts).where(and(eq(linkedAccounts.userId,userId)));}
