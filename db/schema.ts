import { bigint, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export type MeshlyPreferences = {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  defaultView: "list" | "grid";
  wholeFileFirst: boolean;
  reserveBytes: number;
  notifications: boolean;
};
export const defaultPreferences: MeshlyPreferences = {
  theme: "light",
  density: "comfortable",
  defaultView: "list",
  wholeFileFirst: true,
  reserveBytes: 536870912,
  notifications: true,
};

export const users = pgTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name"), avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("users_email_idx").on(table.email)]);

export const linkedAccounts = pgTable("linked_accounts", {
  id: text("id").primaryKey(), userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), googleSubject: text("google_subject").notNull(), email: text("email").notNull(), name: text("name"), avatarUrl: text("avatar_url"), mode: text("mode").notNull().default("managed"), refreshTokenEncrypted: text("refresh_token_encrypted").notNull(), storageFolderId: text("storage_folder_id"), quotaLimit: bigint("quota_limit", { mode: "number" }).notNull().default(0), quotaUsage: bigint("quota_usage", { mode: "number" }).notNull().default(0), priority: integer("priority").notNull().default(100), status: text("status").notNull().default("healthy"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("linked_google_subject_idx").on(table.googleSubject), index("linked_accounts_user_idx").on(table.userId)]);

export const logicalFiles = pgTable("logical_files", {
  id: text("id").primaryKey(), userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), parentId: text("parent_id"), name: text("name").notNull(), mimeType: text("mime_type").notNull(), size: bigint("size", { mode: "number" }).notNull(), sha256: text("sha256"), status: text("status").notNull().default("uploading"), starred: integer("starred").notNull().default(0), description: text("description"), version: integer("version").notNull().default(1), trashedAt: timestamp("trashed_at", { withTimezone: true }), trashedParentId: text("trashed_parent_id"), sourceKind: text("source_kind").notNull().default("managed"), sourceAccountId: text("source_account_id").references(() => linkedAccounts.id, { onDelete: "set null" }), sourceDriveFileId: text("source_drive_file_id"), sourceMimeType: text("source_mime_type"), sourceWebViewLink: text("source_web_view_link"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("logical_files_user_parent_idx").on(table.userId, table.parentId), index("logical_files_user_updated_idx").on(table.userId, table.updatedAt), index("logical_files_user_trash_idx").on(table.userId, table.trashedAt), uniqueIndex("logical_files_source_idx").on(table.sourceAccountId, table.sourceDriveFileId)]);

export const chunks = pgTable("chunks", {
  id: text("id").primaryKey(), fileId: text("file_id").references(() => logicalFiles.id, { onDelete: "cascade" }).notNull(), accountId: text("account_id").references(() => linkedAccounts.id, { onDelete: "restrict" }).notNull(), part: integer("part").notNull(), offset: bigint("offset", { mode: "number" }).notNull(), size: bigint("size", { mode: "number" }).notNull(), physicalName: text("physical_name").notNull(), driveFileId: text("drive_file_id"), sha256: text("sha256"), status: text("status").notNull().default("pending"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("chunks_file_part_idx").on(table.fileId, table.part), index("chunks_account_idx").on(table.accountId)]);

export const activities = pgTable("activities", {
  id: text("id").primaryKey(), userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), kind: text("kind").notNull(), subjectId: text("subject_id"), metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("activities_user_idx").on(table.userId, table.createdAt)]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }), preferences: jsonb("preferences").$type<MeshlyPreferences>().notNull().default(defaultPreferences), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shares = pgTable("shares", {
  id: text("id").primaryKey(), userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), fileId: text("file_id").references(() => logicalFiles.id, { onDelete: "cascade" }).notNull(), tokenHash: text("token_hash").notNull(), passwordHash: text("password_hash"), expiresAt: timestamp("expires_at", { withTimezone: true }), maxDownloads: integer("max_downloads"), downloadCount: integer("download_count").notNull().default(0), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [uniqueIndex("shares_token_idx").on(table.tokenHash), index("shares_user_idx").on(table.userId, table.createdAt), index("shares_file_idx").on(table.fileId)]);

export const shareAuthAttempts = pgTable("share_auth_attempts", {
  key: text("key").primaryKey(), shareId: text("share_id").references(() => shares.id, { onDelete: "cascade" }).notNull(), attempts: integer("attempts").notNull().default(0), windowStartedAt: timestamp("window_started_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("share_auth_attempts_share_idx").on(table.shareId)]);

export const syncState = pgTable("sync_state", {
  accountId: text("account_id").primaryKey().references(() => linkedAccounts.id, { onDelete: "cascade" }), changePageToken: text("change_page_token"), lastQuotaRefresh: timestamp("last_quota_refresh", { withTimezone: true }), lastRecoverySnapshot: timestamp("last_recovery_snapshot", { withTimezone: true }), lastError: text("last_error"), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
