import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { composeProfile } from "@/lib/profile-records"
import type { Profile, PublicProfile } from "@/lib/supabase/types"

const publicProfileFixture: PublicProfile = {
  id: "user_1",
  created_at: "2026-03-21T00:00:00.000Z",
  updated_at: "2026-03-21T00:00:00.000Z",
  display_name: "王小明",
  avatar_url: null,
}

const privateProfileFixture: Profile = {
  ...publicProfileFixture,
  avatar_url: "https://example.com/avatar.png",
  role: "user",
  phone: "0912345678",
  bio: "這是自我介紹",
  linkedin: "https://linkedin.com/in/example",
  facebook: "https://facebook.com/example",
  github: "https://github.com/example",
  website: "https://example.com",
  resume: "https://example.com/resume.pdf",
  social_links: ["https://blog.example.com"],
}

describe("profile records", () => {
  test("builds a public-safe profile snapshot when private details are missing", () => {
    const profile = composeProfile(publicProfileFixture)

    assert.equal(profile.display_name, "王小明")
    assert.equal(profile.avatar_url, null)
    assert.equal(profile.bio, null)
    assert.equal(profile.phone, null)
    assert.equal(profile.linkedin, null)
    assert.equal(profile.facebook, null)
    assert.equal(profile.github, null)
    assert.equal(profile.website, null)
    assert.equal(profile.resume, null)
    assert.deepEqual(profile.social_links, [])
  })

  test("merges private details for signed-in viewers", () => {
    const profile = composeProfile(publicProfileFixture, privateProfileFixture)

    assert.deepEqual(profile, privateProfileFixture)
  })

  test("falls back to public avatar_url (gravatar) when private avatar_url is null", () => {
    const publicWithGravatar = { ...publicProfileFixture, avatar_url: "https://gravatar.com/avatar/abc" }
    const privateNoAvatar = { ...privateProfileFixture, avatar_url: null }
    const profile = composeProfile(publicWithGravatar, privateNoAvatar)

    assert.equal(profile.avatar_url, "https://gravatar.com/avatar/abc")
  })
})
