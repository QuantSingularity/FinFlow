import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/login/);
  });

  test("displays login form elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation error for empty form submission", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Expect either HTML5 validation or in-app error
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/password/i).fill("WrongPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Wait for the error message (API returns 401)
    await expect(
      page.getByText(/invalid credentials|email or password/i),
    ).toBeVisible({ timeout: 8000 });
  });

  test("register page is accessible", async ({ page }) => {
    await page.goto("/login");
    const registerLink = page.getByRole("link", { name: /register|sign up/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });
});
