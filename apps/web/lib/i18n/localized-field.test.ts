import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { localizedField } from "@/lib/i18n/localized-field"

describe("localizedField", () => {
  const row = {
    title: "中文標題",
    title_en: "English title",
    description: "中文說明",
    description_en: null as string | null,
  }

  test("default locale always returns the base field", () => {
    assert.deepEqual(localizedField(row, "title", "zh-TW"), {
      value: "中文標題",
      isFallback: false,
    })
  })

  test("en locale uses the _en field when present", () => {
    assert.deepEqual(localizedField(row, "title", "en"), {
      value: "English title",
      isFallback: false,
    })
  })

  test("en locale falls back when _en is null", () => {
    assert.deepEqual(localizedField(row, "description", "en"), {
      value: "中文說明",
      isFallback: true,
    })
  })

  test("en locale treats blank string _en as missing", () => {
    const blank = { ...row, title_en: "   " }
    assert.deepEqual(localizedField(blank, "title", "en"), {
      value: "中文標題",
      isFallback: true,
    })
  })
})
