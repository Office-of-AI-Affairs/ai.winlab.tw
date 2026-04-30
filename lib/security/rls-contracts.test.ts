import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";

// Contract suite for production RLS state.
//
// The snapshot file (lib/security/rls-snapshot.json) is the canonical
// representation of every policy on prod. Refresh it manually via the SQL
// in scripts/refresh-rls-snapshot.md whenever an RLS migration ships.
//
// Drift between this file's expectations and the snapshot = test fails =
// CI red. Drift between the snapshot and prod = git diff after refresh,
// caught at PR review time.
//
// This is the v1 contract. Once we have a `DATABASE_URL` available to CI,
// a sibling rls-runtime.test.ts can do real role-impersonated queries to
// catch semantic drift the snapshot can't see.

type Snapshot = {
  generated_at: string;
  project_ref: string;
  tables_with_rls: { rel: string; policy_count: number }[];
  policies: {
    rel: string;
    polname: string;
    op: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
    roles: string[];
    using_summary?: string;
    check_summary?: string;
    trade_off?: string;
    note?: string;
  }[];
};

const snapshot = JSON.parse(
  readFileSync(resolve(process.cwd(), "lib/security/rls-snapshot.json"), "utf8"),
) as Snapshot;

function find(rel: string, op: Snapshot["policies"][number]["op"], rolePredicate?: (r: string[]) => boolean) {
  return snapshot.policies.filter(
    (p) => p.rel === rel && p.op === op && (!rolePredicate || rolePredicate(p.roles)),
  );
}

const hasAnon = (r: string[]) => r.includes("anon") || r.includes("public");
const hasAuthenticated = (r: string[]) => r.includes("authenticated") || r.includes("public");

describe("RLS — schema-level compliance", () => {
  test("every committed migration target table has RLS enabled", () => {
    const expected = [
      "public.announcements",
      "public.carousel_slides",
      "public.competition_owners",
      "public.competition_private_details",
      "public.competitions",
      "public.contacts",
      "public.event_participants",
      "public.events",
      "public.external_results",
      "public.introduction",
      "public.oauth_auth_codes",
      "public.oauth_clients",
      "public.organization_members",
      "public.privacy_policy",
      "public.profiles",
      "public.public_profiles",
      "public.recruitment_interests",
      "public.result_coauthors",
      "public.result_tags",
      "public.results",
      "public.tags",
      "public.upload_tokens",
      "storage.objects",
    ];
    const actual = snapshot.tables_with_rls.map((t) => t.rel).sort();
    assert.deepEqual(actual, expected.sort(), "RLS-enabled table set drifted from expected");
  });

  test("dropped tables stay dropped", () => {
    // The teams subsystem was nuked in 20260430000007. If it ever shows up
    // again, something resurrected it accidentally.
    const dead = ["public.teams", "public.team_members", "public.team_invitations", "public.public_teams"];
    for (const rel of dead) {
      assert.equal(
        snapshot.tables_with_rls.find((t) => t.rel === rel),
        undefined,
        `dropped table ${rel} re-appeared`,
      );
      assert.equal(
        snapshot.policies.find((p) => p.rel === rel),
        undefined,
        `policies on dropped table ${rel} re-appeared`,
      );
    }
  });

  test("oauth_auth_codes is fully gated (no policies = service role only)", () => {
    const ent = snapshot.tables_with_rls.find((t) => t.rel === "public.oauth_auth_codes");
    assert.equal(ent?.policy_count, 0, "oauth_auth_codes must stay locked to service role only");
  });
});

describe("RLS — critical SELECT contracts", () => {
  test("anon cannot read profiles", () => {
    const sel = find("public.profiles", "SELECT");
    const anonReader = sel.find((p) => hasAnon(p.roles));
    assert.equal(anonReader, undefined, "anon must not have a SELECT policy on profiles");
  });

  test("authenticated profiles SELECT is the documented PII-vs-UX trade-off", () => {
    const sel = find("public.profiles", "SELECT", hasAuthenticated);
    assert.equal(sel.length, 1);
    assert.equal(sel[0].using_summary, "true");
    assert.ok(sel[0].trade_off, "any change to authenticated profiles SELECT MUST update the trade_off note");
  });

  test("public.results SELECT distinguishes anon (published) from authenticated (own + published + admin)", () => {
    const anonSel = find("public.results", "SELECT", hasAnon);
    assert.equal(anonSel.length, 1);
    assert.equal(anonSel[0].using_summary, "status='published'");

    const authSel = find("public.results", "SELECT", hasAuthenticated);
    const explicit = authSel.find((p) => p.roles.includes("authenticated"));
    assert.ok(explicit, "results needs an explicit authenticated SELECT policy");
    assert.match(explicit!.using_summary ?? "", /status='published'/);
    assert.match(explicit!.using_summary ?? "", /author_id=auth\.uid\(\)/);
    assert.match(explicit!.using_summary ?? "", /is_admin/);
  });

  test("results SELECT no longer references is_team_leader", () => {
    const all = find("public.results", "SELECT");
    for (const p of all) {
      assert.doesNotMatch(p.using_summary ?? "", /team_leader/i, `${p.polname} still references is_team_leader`);
      assert.doesNotMatch(p.using_summary ?? "", /team_id/i, `${p.polname} still references team_id`);
    }
  });

  test("recruitment_interests SELECT is gated to self / admin / recruitment owner", () => {
    const sel = find("public.recruitment_interests", "SELECT");
    assert.equal(sel.length, 1);
    assert.equal(
      sel[0].using_summary,
      "user_id=auth.uid() OR is_admin OR is_recruitment_owner",
      "recruitment_interests SELECT semantics must not silently widen",
    );
  });

  test("competition_owners SELECT no longer recurses on itself (the fix from 20260422000002 stays in)", () => {
    const sel = find("public.competition_owners", "SELECT");
    assert.equal(sel.length, 1);
    // Recursion happens when the policy references the same table inside its
    // own USING clause without going through SECURITY DEFINER. The current
    // form is `user_id=auth.uid() OR is_admin` — neither branch loops.
    assert.doesNotMatch(
      sel[0].using_summary ?? "",
      /co2|competition_owners co|self_table/,
      "competition_owners must not recurse on itself",
    );
  });

  test("result_coauthors SELECT does not leak draft coauthors to every authenticated user", () => {
    const sel = find("public.result_coauthors", "SELECT");
    assert.equal(sel.length, 1);
    // The pre-tighten form was `published OR auth.uid() IS NOT NULL` which let
    // any logged-in user read draft coauthors. The fix requires a draft to be
    // legible only to author / coauthor-self / admin.
    assert.doesNotMatch(
      sel[0].using_summary ?? "",
      /auth\.uid\(\) IS NOT NULL/i,
      "result_coauthors SELECT regressed: draft coauthors leak to every authenticated user",
    );
  });
});

describe("RLS — storage bucket contracts", () => {
  test("announcement-images bucket: anon can read, only admin can write", () => {
    const all = snapshot.policies.filter((p) => p.rel === "storage.objects");
    const insertPolicies = all.filter((p) => p.op === "INSERT" && /announcement-images/.test(p.check_summary ?? ""));
    assert.equal(insertPolicies.length, 1);
    assert.match(insertPolicies[0].check_summary ?? "", /is_admin/);

    const selectPolicies = all.filter((p) => p.op === "SELECT" && /announcement-images/.test(p.using_summary ?? ""));
    assert.equal(selectPolicies.length, 1);
    assert.ok(hasAnon(selectPolicies[0].roles));
  });

  test("resumes bucket: documented PII-vs-UX trade-off", () => {
    const sel = snapshot.policies.find(
      (p) =>
        p.rel === "storage.objects" &&
        p.op === "SELECT" &&
        /resumes/.test(p.using_summary ?? "") &&
        !/foldername/.test(p.using_summary ?? ""),
    );
    assert.ok(sel, "resumes SELECT policy must exist");
    assert.ok(sel!.trade_off, "any change to resumes SELECT MUST update the trade_off note");

    const insert = snapshot.policies.find(
      (p) =>
        p.rel === "storage.objects" &&
        p.op === "INSERT" &&
        /resumes/.test(p.check_summary ?? ""),
    );
    assert.ok(insert);
    assert.match(insert!.check_summary ?? "", /foldername\[1\]=auth\.uid\(\)/);
  });
});

describe("RLS — sanity checks (catch the obviously-broken)", () => {
  test("no policy still references the dropped is_team_leader function", () => {
    for (const p of snapshot.policies) {
      const blob = `${p.using_summary ?? ""} ${p.check_summary ?? ""}`;
      assert.doesNotMatch(blob, /is_team_leader/i, `${p.rel}.${p.polname} references dropped is_team_leader`);
      assert.doesNotMatch(blob, /get_user_team_ids/i, `${p.rel}.${p.polname} references dropped get_user_team_ids`);
    }
  });

  test("no policy uses 'true' as anon SELECT on profiles or storage:resumes (PII tables)", () => {
    for (const p of snapshot.policies) {
      if (p.op !== "SELECT") continue;
      if (!hasAnon(p.roles)) continue;
      const piiTables = ["public.profiles"];
      if (piiTables.includes(p.rel) && p.using_summary === "true") {
        assert.fail(`${p.rel}.${p.polname} opens anon SELECT to all rows — PII leak`);
      }
    }
  });
});
