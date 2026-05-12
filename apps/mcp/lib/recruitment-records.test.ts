import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { composeRecruitment } from "@/lib/recruitment-records";
import type {
  RecruitmentPrivateDetails,
  RecruitmentSummary,
} from "@/lib/supabase/types";

const summaryFixture: RecruitmentSummary = {
  id: "rec_1",
  created_at: "2026-03-21T00:00:00.000Z",
  updated_at: "2026-03-21T00:00:00.000Z",
  title: "企業實習招募",
  link: "https://example.com/apply",
  image: null,
  company_description: "公開簡介",
  start_date: "2026-04-01",
  end_date: "2026-05-01",
  event_id: null,
  created_by: null,
  pinned: false,
};

const detailsFixture: RecruitmentPrivateDetails = {
  competition_id: "rec_1",
  created_at: "2026-03-21T00:00:00.000Z",
  updated_at: "2026-03-21T00:00:00.000Z",
  positions: [
    {
      name: "AI 實習生",
      location: "Taipei",
      type: "internship",
      count: 2,
      salary: "200/hr",
      responsibilities: "建立模型",
      requirements: "熟悉 Python",
      nice_to_have: "有競賽經驗",
    },
  ],
  application_method: {
    email: "jobs@example.com",
  },
  contact: {
    name: "王小明",
  },
  required_documents: "履歷、成績單",
};

describe("recruitment records", () => {
  test("builds a public-safe recruitment record when private details are missing", () => {
    const recruitment = composeRecruitment(summaryFixture);

    assert.equal(recruitment.title, "企業實習招募");
    assert.equal(recruitment.company_description, "公開簡介");
    assert.equal(recruitment.positions, null);
    assert.equal(recruitment.application_method, null);
    assert.equal(recruitment.contact, null);
    assert.equal(recruitment.required_documents, null);
  });

  test("merges private recruitment details for signed-in viewers", () => {
    const recruitment = composeRecruitment(summaryFixture, detailsFixture);

    assert.equal(recruitment.positions?.[0]?.name, "AI 實習生");
    assert.equal(recruitment.application_method?.email, "jobs@example.com");
    assert.equal(recruitment.contact?.name, "王小明");
    assert.equal(recruitment.required_documents, "履歷、成績單");
  });
});
