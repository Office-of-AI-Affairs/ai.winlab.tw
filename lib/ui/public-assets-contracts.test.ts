import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

function collectProjectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = resolve(directory, entry)
    const stats = statSync(filePath)

    if (stats.isDirectory()) {
      return collectProjectFiles(filePath)
    }

    if (!/\.(ts|tsx)$/.test(filePath)) {
      return []
    }

    return [filePath]
  })
}

describe("public assets contracts", () => {
  test("app, components, and lib no longer reference the legacy placeholder asset", () => {
    const sourceFiles = [
      ...collectProjectFiles(resolve(process.cwd(), "app")),
      ...collectProjectFiles(resolve(process.cwd(), "components")),
      ...collectProjectFiles(resolve(process.cwd(), "lib")),
    ]

    const offenders = sourceFiles.filter((filePath) =>
      !filePath.endsWith("/lib/utils.ts") &&
      !filePath.endsWith("/lib/ui/public-assets-contracts.test.ts") &&
      readFileSync(filePath, "utf8").includes("/placeholder.png")
    )

    assert.deepEqual(offenders, [])
  })

  test("public directory only contains expected assets", () => {
    const publicDir = resolve(process.cwd(), "public")
    if (!existsSync(publicDir)) return
    const files = readdirSync(publicDir)
    const allowed = new Set(["og.png"])
    const unexpected = files.filter((f) => !allowed.has(f))
    assert.deepEqual(unexpected, [], `unexpected files in public/: ${unexpected.join(", ")}`)
  })
})
