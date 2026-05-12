import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const eslintConfig = readFileSync(resolve(process.cwd(), "eslint.config.mjs"), "utf8")

describe("eslint config", () => {
  test("ignores nested worktrees and generated outputs", () => {
    assert.ok(eslintConfig.includes('".worktrees/**"'))
    assert.ok(eslintConfig.includes('"**/.next/**"'))
  })
})
