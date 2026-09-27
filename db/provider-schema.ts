import { bigint, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { logicalFiles, users } from "@/db/schema";

export const providerAccounts = pgTable("provider_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(),
  externalAccountId: text("external_account_id").notNull(),
  email: text("email"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  quotaLimit: bigint("quota_limit", { mode: "number" }).notNull().default(0),
  quotaUsage: bigint("quota_usage", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("healthy"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("provider_accounts_provider_external_idx").on(table.provider, table.externalAccountId),
  index("provider_accounts_user_provider_idx").on(table.userId, table.provider),
]);

export const providerObjects = pgTable("provider_objects", {
  id: text("id").primaryKey(),
  fileId: text("file_id").references(() => logicalFiles.id, { onDelete: "cascade" }).notNull(),
  providerAccountId: text("provider_account_id").references(() => providerAccounts.id, { onDelete: "restrict" }).notNull(),
  provider: text("provider").notNull(),
  physicalName: text("physical_name").notNull(),
  remoteId: text("remote_id"),
  remotePath: text("remote_path"),
  logicalSize: bigint("logical_size", { mode: "number" }).notNull(),
  physicalSize: bigint("physical_size", { mode: "number" }).notNull(),
  ciphertextSha256: text("ciphertext_sha256"),
  uploadSessionEncrypted: text("upload_session_encrypted"),
  uploadedBytes: bigint("uploaded_bytes", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("uploading"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("provider_objects_file_idx").on(table.fileId),
  index("provider_objects_account_status_idx").on(table.providerAccountId, table.status),
]);
