// App tables, mirroring drizzle/*.sql (the SQL is the source of truth).
// Keys keep the column names, so rows have the same shape the Supabase
// client returned and the types in @winlab/db still describe them.
// Timestamps stay ISO strings for the same reason.
import { sql } from "drizzle-orm"
import type { Json } from "@winlab/db"
import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
})

// timestamptz as an ISO 8601 string ("2026-10-24T04:00:00.000Z"), the shape
// PostgREST returned. Postgres's own text form ("2026-10-24 04:00:00+00")
// does not parse in Safari's Date. Precision is milliseconds.
const timestamptz = customType<{ data: string; driverData: string | Date }>({
  dataType: () => "timestamp with time zone",
  fromDriver: (value) => new Date(value).toISOString(),
  toDriver: (value) => value,
})

export const audit_log = pgTable("audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	table_name: text().notNull(),
	row_id: uuid(),
	action: text().notNull(),
	actor: uuid().default(sql`app_user_id()`),
	created_at: timestamptz().default(sql`now()`).notNull(),
	changed_fields: text().array(),
});

export const upload_tokens = pgTable("upload_tokens", {
	token: text().primaryKey().notNull(),
	user_id: uuid().notNull(),
	category: text().default('announcement').notNull(),
	expires_at: timestamptz().default(sql`(now() + '00:10:00'::interval)`).notNull(),
	used: boolean().default(false).notNull(),
});

export const announcements = pgTable("announcements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	category: text().default('一般').notNull(),
	title: text().default('').notNull(),
	content: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
	status: text().default('draft').notNull(),
	author_id: uuid(),
	event_id: uuid(),
	slug: text().notNull(),
	title_en: text(),
	publish_at: timestamptz(),
});

export const articles = pgTable("articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	author_id: uuid().notNull(),
	title: text().default('新文章').notNull(),
	summary: text(),
	cover_image_url: text(),
	content: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
	status: text().default('draft').notNull(),
	published_at: timestamptz(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
});

export const competitions = pgTable("competitions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	title: text().default('').notNull(),
	link: text().default('').notNull(),
	image: text(),
	start_date: text().default(''),
	company_description: text(),
	event_id: uuid(),
	end_date: date(),
	created_by: uuid(),
	pinned: boolean().default(false).notNull(),
});

export const carousel_slides = pgTable("carousel_slides", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	title: text().default('').notNull(),
	description: text(),
	link: text(),
	image: text(),
	sort_order: integer().default(0).notNull(),
	title_en: text(),
	description_en: text(),
});

export const competition_private_details = pgTable("competition_private_details", {
	competition_id: uuid().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	positions: jsonb().$type<Json>(),
	application_method: jsonb().$type<Json>(),
	contact: jsonb().$type<Json>(),
	required_documents: text(),
});

export const content_revisions = pgTable("content_revisions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	table_name: text().notNull(),
	row_id: uuid().notNull(),
	snapshot: jsonb().$type<Json>().notNull(),
	changed_by: uuid(),
	created_at: timestamptz().default(sql`now()`).notNull(),
});

export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	name: text().default('').notNull(),
	position: text(),
	phone: text(),
	email: text(),
	sort_order: integer().default(0).notNull(),
});

export const events = pgTable("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	cover_image: text(),
	pinned: boolean().default(false).notNull(),
	sort_order: integer().default(0).notNull(),
	status: text().default('draft').notNull(),
	name_en: text(),
}, (table) => [
	unique("events_slug_key").on(table.slug),
]);

export const introduction = pgTable("introduction", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	title: text().default('國立陽明交通大學 人工智慧專責辦公室').notNull(),
	content: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
	title_en: text(),
	content_en: jsonb().$type<Json>(),
});

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	display_name: text(),
	avatar_url: text(),
	role: text().default('user').notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	phone: text(),
	social_links: text().array().default([""]),
	bio: text(),
	linkedin: text(),
	facebook: text(),
	github: text(),
	website: text(),
	resume: text(),
	tags: text().array().default([""]).notNull(),
});

export const organization_members = pgTable("organization_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	category: text().notNull(),
	name: text().notNull(),
	summary: text(),
	image: text(),
	link: text(),
	sort_order: integer().default(0).notNull(),
	school: text(),
	research_areas: text(),
	email: text(),
	website: text(),
	member_role: text(),
	group_order: integer().default(1).notNull(),
});

export const public_profiles = pgTable("public_profiles", {
	id: uuid().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	display_name: text(),
	avatar_url: text(),
	has_profile_data: boolean().default(false).notNull(),
	bio: text(),
	linkedin: text(),
	facebook: text(),
	github: text(),
	website: text(),
	social_links: text().array().default([""]),
	role: text(),
	resume: text(),
});

export const results = pgTable("results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	title: text().default('').notNull(),
	date: text().default('').notNull(),
	header_image: text(),
	summary: text().default(''),
	content: jsonb().$type<Record<string, unknown>>().default({}),
	status: text().default('draft').notNull(),
	author_id: uuid(),
	pinned: boolean().default(false).notNull(),
	event_id: uuid(),
	title_en: text(),
});

export const external_results = pgTable("external_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	updated_at: timestamptz().default(sql`now()`).notNull(),
	user_id: uuid().notNull(),
	title: text().notNull(),
	description: text(),
	link: text(),
	image: text(),
});

export const privacy_policy = pgTable("privacy_policy", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	content: jsonb().$type<Record<string, unknown>>().notNull(),
	version: integer().notNull(),
	note: text(),
	created_at: timestamptz().default(sql`now()`).notNull(),
	created_by: uuid(),
});

export const recruitment_interests = pgTable("recruitment_interests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	competition_id: uuid().notNull(),
	user_id: uuid().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
}, (table) => [
	unique("recruitment_interests_competition_id_user_id_key").on(table.competition_id, table.user_id),
]);

export const tags = pgTable("tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	parent_id: uuid(),
	sort_order: integer().default(0).notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
});

export const result_tags = pgTable("result_tags", {
	result_id: uuid().notNull(),
	tag_id: uuid().notNull(),
}, (table) => [
	primaryKey({ columns: [table.result_id, table.tag_id], name: "result_tags_pkey"}),
]);

export const event_participants = pgTable("event_participants", {
	event_id: uuid().notNull(),
	user_id: uuid().notNull(),
	created_at: timestamptz().default(sql`now()`),
}, (table) => [
	primaryKey({ columns: [table.event_id, table.user_id], name: "event_participants_pkey"}),
]);

export const result_coauthors = pgTable("result_coauthors", {
	result_id: uuid().notNull(),
	user_id: uuid().notNull(),
	created_at: timestamptz().default(sql`now()`).notNull(),
}, (table) => [
	primaryKey({ columns: [table.result_id, table.user_id], name: "result_coauthors_pkey"}),
]);

export const competition_owners = pgTable("competition_owners", {
	competition_id: uuid().notNull(),
	user_id: uuid().notNull(),
	added_by: uuid(),
	created_at: timestamptz().default(sql`now()`).notNull(),
}, (table) => [
	primaryKey({ columns: [table.competition_id, table.user_id], name: "competition_owners_pkey"}),
]);

export const files = pgTable("files", {
	bucket: text().notNull(),
	path: text().notNull(),
	content_type: text().notNull(),
	size: integer().notNull(),
	data: bytea().notNull(),
	owner_id: uuid(),
	created_at: timestamptz().default(sql`now()`).notNull(),
}, (table) => [
	primaryKey({ columns: [table.bucket, table.path], name: "files_pkey"}),
]);
