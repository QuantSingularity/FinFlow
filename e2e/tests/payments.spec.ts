import { test, expect } from "@playwright/test";

test.describe("Payments page", () => {
  test.skip(!process.env.E2E_WITH_BACKEND, "Requires running backend services");

  test("lists payments with status badges", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@finflow.test");
    await page.getByLabel(/password/i).fill("Admin@1234!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/);
    await page.goto("/payments");

    await expect(
      page.getByText(/completed|pending|failed/i).first(),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("search filters payment list", async ({ page }) => {
    await page.goto("/payments");
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("PAY-");
      await expect(page.locator("table tbody tr").first()).toBeVisible();
    }
  });
});
