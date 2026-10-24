import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const baseline = readFileSync(resolve(process.cwd(), "drizzle/0001_baseline.sql"), "utf8")
const profilePage = readFileSync(resolve(process.cwd(), "app/[locale]/profile/[id]/page.tsx"), "utf8")
const profileLayout = readFileSync(resolve(process.cwd(), "app/[locale]/profile/[id]/layout.tsx"), "utf8")
const profileData = readFileSync(resolve(process.cwd(), "lib/data/profile.ts"), "utf8")
const eventPage = readFileSync(resolve(process.cwd(), "app/[locale]/events/[slug]/page.tsx"), "utf8")
const eventData = readFileSync(resolve(process.cwd(), "app/[locale]/events/[slug]/data.ts"), "utf8")
const eventResultPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/results/[id]/page.tsx"),
  "utf8"
)
const eventRecruitmentDetailPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/recruitment/[id]/page.tsx"),
  "utf8"
)
const recruitmentDialog = readFileSync(resolve(process.cwd(), "components/events/recruitment-dialog.tsx"), "utf8")

describe("private data contracts", () => {
  test("the schema keeps public profile fields apart from private ones", () => {
    assert.ok(baseline.includes('CREATE TABLE IF NOT EXISTS "public"."public_profiles"'))
    assert.ok(baseline.includes('CREATE TABLE IF NOT EXISTS "public"."competition_private_details"'))
    // public_profiles has no phone column: the private row stays private.
    const publicProfiles = baseline.slice(baseline.indexOf('"public"."public_profiles" ('))
    assert.ok(!publicProfiles.slice(0, publicProfiles.indexOf(");")).includes('"phone"'))
  })

  test("public profile reads no longer query private profile rows", () => {
    assert.ok(profilePage.includes(".from(public_profiles)"))
    assert.ok(profileLayout.includes(".from(public_profiles)"))
    // The private profiles row is read only behind mayReadPrivateProfile.
    assert.ok(profileData.includes("mayReadPrivateProfile(viewer, id)"))
    // The /events/[slug] page moved its data fetches into data.ts for ISR.
    // Contract still holds: public reads must hit public_profiles.
    assert.ok(eventData.includes("public_profiles.display_name"))
    assert.ok(!eventData.includes("profiles.phone"))
    assert.ok(eventResultPage.includes("public_profiles.display_name"))
  })

  test("teams subsystem is fully removed", () => {
    // The teams / team_members / team_invitations / public_teams tables were
    // dropped in 20260430000007 along with the team-leader RLS branches and
    // the results.team_id / results.type columns. Make sure no caller leaks
    // back in.
    assert.ok(!eventData.includes('"teams"'))
    assert.ok(!eventData.includes('"team_members"'))
    assert.ok(!eventData.includes('"public_teams"'))
    assert.ok(!eventResultPage.includes('"teams"'))
    assert.ok(!eventResultPage.includes('"team_members"'))
    assert.ok(!eventResultPage.includes('"public_teams"'))
  })

  test("recruitment pages fetch summary rows separately from private details", () => {
    assert.ok(!existsSync(resolve(process.cwd(), "app/[locale]/recruitment/page.tsx")))
    assert.ok(!existsSync(resolve(process.cwd(), "app/[locale]/recruitment/[id]/page.tsx")))
    // Private details are read and written only behind the server checks.
    const recruitmentData = readFileSync(resolve(process.cwd(), "lib/data/recruitment.ts"), "utf8")
    const recruitmentActions = readFileSync(resolve(process.cwd(), "lib/actions/recruitment.ts"), "utf8")
    assert.ok(eventRecruitmentDetailPage.includes("getRecruitmentPageData("))
    assert.ok(recruitmentData.includes(".from(competition_private_details)"))
    assert.ok(recruitmentDialog.includes("saveRecruitment("))
    assert.ok(recruitmentActions.includes("isRecruitmentOwner(viewer.id, input.id)"))
  })
})
