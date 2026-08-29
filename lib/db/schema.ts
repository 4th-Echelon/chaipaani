import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid, } from "drizzle-orm/pg-core";

export const reportTypeEnum = pgEnum("report_type", ["paid", "refused"]);
export const modeEnum = pgEnum("payment_mode", ["cash", "upi", "other"]);
export const outcomeEnum = pgEnum("outcome", [
  "completed",
  "partial",
  "not_completed",
  "refused_got_service",
  "refused_denied",
]);
export const statusEnum = pgEnum("report_status", ["published", "held", "removed"]);
export const tierEnum = pgEnum("report_tier", ["reported", "corroborated", "evidence_backed"]);
export const voteKindEnum = pgEnum("vote_kind", ["helpful", "fake"]);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  short: text("short").notNull(),
});

export const states = pgTable("states", {
  code: text("code").primaryKey(),
  name: text("name").notNull().unique(),
});

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    stateCode: text("state_code")
      .notNull()
      .references(() => states.code),
    lgdCode: text("lgd_code"),
  },
  (t) => [uniqueIndex("cities_name_state_idx").on(t.name, t.stateCode)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    reportType: reportTypeEnum("report_type").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    service: text("service"),
    officialRole: text("official_role"),
    amount: integer("amount"),
    mode: modeEnum("mode"),
    cityId: integer("city_id").references(() => cities.id),
    cityText: text("city_text").notNull(),
    stateCode: text("state_code")
      .notNull()
      .references(() => states.code),
    incidentDate: date("incident_date").notNull(),
    outcome: outcomeEnum("outcome").notNull(),
    note: text("note"),
    lang: text("lang").notNull().default("en"),
    status: statusEnum("status").notNull().default("published"),
    tier: tierEnum("tier").notNull().default("reported"),
    clusterId: uuid("cluster_id"),
    ipHash: text("ip_hash"),
    turnstileOk: boolean("turnstile_ok").notNull().default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    fakeCount: integer("fake_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_state_idx").on(t.stateCode),
    index("reports_dept_idx").on(t.departmentId),
    index("reports_created_idx").on(t.createdAt),
    index("reports_status_idx").on(t.status),
    index("reports_cluster_idx").on(t.clusterId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    kind: voteKindEnum("kind").notNull(),
    voterHash: text("voter_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.reportId, t.kind, t.voterHash] })],
);

export const moderationLog = pgTable("moderation_log", {
  id: serial("id").primaryKey(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const takedowns = pgTable("takedowns", {
  id: serial("id").primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  requesterKind: text("requester_kind").notNull(),
  requesterContact: text("requester_contact"),
  reason: text("reason").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  decision: text("decision"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  notes: text("notes"),
});

export const evidenceMatches = pgTable("evidence_matches", {
  id: serial("id").primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  utrHash: text("utr_hash").notNull().unique(),
  amount: integer("amount").notNull(),
  txnDate: date("txn_date").notNull(),
  counterpartyNorm: text("counterparty_norm"),
  matchScore: integer("match_score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});

export const hashKeys = pgTable("hash_keys", {
  day: date("day").primaryKey(),
  key: text("key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Precomputed statistics read by public pages; refreshed by cron and after writes. */
export const statsSnapshots = pgTable("stats_snapshots", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  computedMs: integer("computed_ms").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;
