import { bigint, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "@/db/schema";

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
