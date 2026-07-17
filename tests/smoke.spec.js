// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * コンソールエラーを収集するヘルパー
 * @param {import('@playwright/test').Page} page
 * @returns {string[]}
 */
function collectConsoleErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  return errors;
}

test.describe("Smoke Tests", () => {
  test("トップページ (/) が正常に表示される", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    const response = await page.goto("/");
    expect(response.status()).toBe(200);

    // 代表的な見出しが表示されていることを確認
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "News" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();

    // コンソールエラーがないことを確認
    expect(consoleErrors, `コンソールエラーが発生しました: ${consoleErrors.join(", ")}`).toHaveLength(0);
  });

  test("メンバーページ (/members) が正常に表示される", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    const response = await page.goto("/members");
    expect(response.status()).toBe(200);

    // Members ナビゲーションラベルが表示されていることを確認
    await expect(page.locator(".menu-label", { hasText: "Members" })).toBeVisible();

    // 指導教員セクションが表示されていることを確認
    await expect(page.locator("#staffs")).toBeVisible();

    // コンソールエラーがないことを確認
    expect(consoleErrors, `コンソールエラーが発生しました: ${consoleErrors.join(", ")}`).toHaveLength(0);
  });

  test("プロジェクト一覧 (/projects/list) が正常に表示される", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    // /projects/list は /projects/list/1 へリダイレクトする
    const response = await page.goto("/projects/list");
    // 最終的なレスポンスが200であることを確認
    await page.waitForURL(/\/projects\/list\/\d+/);
    expect(page.url()).toMatch(/\/projects\/list\/\d+/);

    // Projects ヘッドタイトルが含まれるか確認
    await expect(page.locator("head title")).toContainText("Projects");

    // コンソールエラーがないことを確認
    expect(consoleErrors, `コンソールエラーが発生しました: ${consoleErrors.join(", ")}`).toHaveLength(0);
  });

  test("プロダクト一覧 (/products/list) が正常に表示される", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    // /products/list は /products/list/1 へリダイレクトする
    await page.goto("/products/list");
    await page.waitForURL(/\/products\/list\/\d+/);
    expect(page.url()).toMatch(/\/products\/list\/\d+/);

    // Products ヘッドタイトルが含まれるか確認
    await expect(page.locator("head title")).toContainText("Products");

    // コンソールエラーがないことを確認
    expect(consoleErrors, `コンソールエラーが発生しました: ${consoleErrors.join(", ")}`).toHaveLength(0);
  });

  test("ニュース一覧 (/news/list) が正常に表示される", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    // /news/list は /news/list/1 へリダイレクトする
    await page.goto("/news/list");
    await page.waitForURL(/\/news\/list\/\d+/);
    expect(page.url()).toMatch(/\/news\/list\/\d+/);

    // News 見出しが表示されていることを確認
    await expect(page.getByRole("heading", { name: "News" })).toBeVisible();

    // コンソールエラーがないことを確認
    expect(consoleErrors, `コンソールエラーが発生しました: ${consoleErrors.join(", ")}`).toHaveLength(0);
  });
});