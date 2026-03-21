import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260321000001_split_public_private_profile_recruitment.sql"
  ),
  "utf8"
)
const profilePage = readFileSync(resolve(process.cwd(), "app/profile/[id]/page.tsx"), "utf8")
const profileLayout = readFileSync(resolve(process.cwd(), "app/profile/[id]/layout.tsx"), "utf8")
const eventPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/page.tsx"), "utf8")
const eventResultPage = readFileSync(
  resolve(process.cwd(), "app/events/[slug]/results/[id]/page.tsx"),
  "utf8"
)
const recruitmentPage = readFileSync(resolve(process.cwd(), "app/recruitment/page.tsx"), "utf8")
const recruitmentDetailPage = readFileSync(resolve(process.cwd(), "app/recruitment/[id]/page.tsx"), "utf8")
const eventRecruitmentDetailPage = readFileSync(
  resolve(process.cwd(), "app/events/[slug]/recruitment/[id]/page.tsx"),
  "utf8"
)
const recruitmentDialog = readFileSync(resolve(process.cwd(), "components/recruitment-dialog.tsx"), "utf8")

describe("private data contracts", () => {
  test("migration splits public profile reads away from private profile fields", () => {
    assert.ok(migration.includes("create table if not exists public.public_profiles"))
    assert.ok(migration.includes('drop policy if exists "Anyone can read profiles" on public.profiles;'))
    assert.ok(migration.includes('create policy "Anyone can read public_profiles"'))
  })

  test("migration moves private recruitment fields into a gated table", () => {
    assert.ok(migration.includes("create table if not exists public.competition_private_details"))
    assert.ok(migration.includes("drop column if exists positions"))
    assert.ok(migration.includes("drop column if exists application_method"))
    assert.ok(migration.includes('create policy "Authenticated can read competition_private_details"'))
    assert.ok(!migration.includes('create policy "Public read competition_private_details"'))
  })

  test("public profile reads no longer query private profile rows", () => {
    assert.ok(profilePage.includes('.from("public_profiles")'))
    assert.ok(profileLayout.includes('.from("public_profiles")'))
    assert.ok(eventPage.includes('.from("public_profiles")'))
    assert.ok(eventResultPage.includes('.from("public_profiles")'))
  })

  test("recruitment pages fetch summary rows separately from private details", () => {
    assert.ok(recruitmentPage.includes('.from("competition_private_details")'))
    assert.ok(recruitmentDetailPage.includes('.from("competition_private_details")'))
    assert.ok(eventRecruitmentDetailPage.includes('.from("competition_private_details")'))
    assert.ok(recruitmentDialog.includes('.from("competition_private_details")'))
  })
})
