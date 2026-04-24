import { test, expect, type Page } from "@playwright/test";

/** Shared login helper — reuse across spec files */
async function loginAs(
  page: Page,
  email = "admin@finflow.test",
  password = "Admin@1234!",
) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Use storage state if available (set up via global setup)
    // Otherwise just verify redirect behaviour
    await page.goto("/dashboard");
  });

  test("redirects to login when not authenticated", async ({ page }) => {
    await expect(page).toHaveURL(/login/);
  });

  test("shows financial KPI cards", async ({ page }) => {
    // This test runs after successful authentication (requires real backend)
    // Mark as slow and skip in CI without backend
    test.skip(
      !process.env.E2E_WITH_BACKEND,
      "Requires running backend services",
    );
    await loginAs(page);
    await expect(page.getByText(/total revenue/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/invoices/i).first()).toBeVisible();
    await expect(page.getByText(/payments/i).first()).toBeVisible();
    await expect(page.getByText(/transactions/i).first()).toBeVisible();
  });

  test("time-period selector changes data range", async ({ page }) => {
    test.skip(!process.env.E2E_WITH_BACKEND, "Requires running backend");
    await loginAs(page);
    const weekBtn = page.getByRole("button", { name: /week/i });
    const monthBtn = page.getByRole("button", { name: /month/i });
    await expect(weekBtn).toBeVisible();
    await expect(monthBtn).toBeVisible();
    await weekBtn.click();
    await expect(weekBtn).toHaveClass(/bg-primary|text-white/);
  });
});
