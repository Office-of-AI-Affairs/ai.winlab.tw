import { expect, test, type Page } from "@playwright/test";

// Public-side smoke tests — every one of these rendered as ○ or ● in the
// build output, so a regression that flips them to ƒ (or 500s) will catch
// here before a visitor does.

async function expectNoConsoleErrors(page: Page, action: () => Promise<void>) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  await action();
  // Filter the well-known benign errors that predate this refactor:
  //   - Gravatar 404s (by design: ?d=404 lets us fall through to initials)
  //   - Supabase 406 on .single() with zero rows (authoritative check path)
  const noisy = errors.filter(
    (e) =>
      !e.includes("gravatar.com/avatar/") &&
      !e.match(/status of 406/),
  );
  expect(noisy, `unexpected console errors: ${noisy.join(" | ")}`).toHaveLength(0);
}

test.describe("public smoke", () => {
  test("homepage renders all sections", async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto("/");
    });
    await expect(page).toHaveTitle(/人工智慧專責辦公室/);
    await expect(page.getByRole("heading", { name: "最新公告" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "活動專區" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "聯絡我們" })).toBeVisible();
    // Header nav should contain the static links. Match by href to avoid
    // strict-mode collisions with content links that happen to include 公告/活動.
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: /^\[ 關於 \]$/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^\[ 公告 \]$/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^\[ 活動 \]$/ })).toBeVisible();
  });

  test("/introduction loads", async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto("/introduction");
    });
    await expect(page).toHaveTitle(/組織/);
  });

  test("/announcement loads", async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto("/announcement");
    });
    await expect(page).toHaveTitle(/公告/);
    await expect(page.getByRole("heading", { name: "最新公告" })).toBeVisible();
  });

  test("/events loads + lists events", async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto("/events");
    });
    await expect(page).toHaveTitle(/活動/);
    await expect(page.getByRole("heading", { name: "活動專區" })).toBeVisible();
  });

  test("/events/ai-rising-star detail loads with results", async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto("/events/ai-rising-star");
    });
    await expect(page.getByRole("heading", { name: "AI 新秀", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "公告" })).toBeVisible();
    await expect(page.getByRole("button", { name: "成果" })).toBeVisible();
    await expect(page.getByRole("button", { name: "徵才" })).toBeVisible();
  });

  test("/events/unknown-slug shows the not-found client", async ({ page }) => {
    await page.goto("/events/this-slug-does-not-exist");
    await expect(page.getByRole("heading", { name: "找不到這個活動" })).toBeVisible();
    await expect(page.getByRole("link", { name: "返回活動列表" })).toBeVisible();
  });

  test("/privacy loads", async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto("/privacy");
    });
    await expect(page).toHaveTitle(/隱私權政策/);
  });

  test("/login form renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("textbox", { name: "電子信箱" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "密碼" })).toBeVisible();
    await expect(page.getByRole("button", { name: "登入" })).toBeVisible();
  });

  test("unauthenticated resume route redirects to profile", async ({ page }) => {
    // Pick any user id that exists; this one is the Claude Agent.
    const uid = "14349327-65e6-4db3-8f85-a5ecd6c268fa";
    const response = await page.goto(`/profile/${uid}/resume`);
    // Route handler issues a redirect; ensure we land on the profile page.
    expect(page.url()).toContain(`/profile/${uid}`);
    expect(page.url()).not.toContain("/resume");
    expect(response?.status()).toBeLessThan(400);
  });

  test("/does-not-exist renders the custom 404", async ({ page }) => {
    const response = await page.goto("/does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "找不到這個頁面" })).toBeVisible();
    await expect(page.getByRole("link", { name: /返回首頁/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /瀏覽活動/ })).toBeVisible();
  });
});
