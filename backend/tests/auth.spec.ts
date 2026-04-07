import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto("http://localhost:3000");
  });

  test("should allow user to register with valid credentials", async ({
    page,
  }) => {
    // Navigate to register page
    await page.click("text=Sign Up");

    // Fill registration form
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "Password123!");
    await page.fill('input[name="confirmPassword"]', "Password123!");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard after successful registration
    await page.waitForURL("**/dashboard");

    // Verify user is logged in
    const welcomeMessage = await page.textContent(".user-welcome");
    expect(welcomeMessage).toContain("Test");
  });

  test("should prevent registration with invalid data", async ({ page }) => {
    // Navigate to register page
    await page.click("text=Sign Up");

    // Submit empty form
    await page.click('button[type="submit"]');

    // Verify validation errors
    const errors = await page.$$(".error-message");
    expect(errors.length).toBeGreaterThan(0);

    // Fill with invalid email
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', "invalid-email");
    await page.fill('input[name="password"]', "Password123!");
    await page.fill('input[name="confirmPassword"]', "Password123!");

    // Submit form
    await page.click('button[type="submit"]');

    // Verify email validation error
    const emailError = await page.textContent(".email-error");
    expect(emailError).toContain("valid email");
  });

  test("should allow user to login with valid credentials", async ({
    page,
  }) => {
    // Navigate to login page
    await page.click("text=Sign In");

    // Fill login form with test user credentials
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "Password123!");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard after successful login
    await page.waitForURL("**/dashboard");

    // Verify user is logged in
    const welcomeMessage = await page.textContent(".user-welcome");
    expect(welcomeMessage).toContain("Test");
  });

  test("should prevent login with invalid credentials", async ({ page }) => {
    // Navigate to login page
    await page.click("text=Sign In");

    // Fill login form with invalid credentials
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "WrongPassword123!");

    // Submit form
    await page.click('button[type="submit"]');

    // Verify error message
    const errorMessage = await page.textContent(".auth-error");
    expect(errorMessage).toContain("Invalid credentials");
  });

  test("should allow user to logout", async ({ page }) => {
    // Login first
    await page.click("text=Sign In");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Click on user menu
    await page.click(".user-menu-button");

    // Click logout
    await page.click("text=Logout");

    // Verify redirect to home page
    await page.waitForURL("**/");

    // Verify login button is visible (user is logged out)
    const loginButton = await page.isVisible("text=Sign In");
    expect(loginButton).toBeTruthy();
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Try to access protected route directly
    await page.goto("http://localhost:3000/dashboard");

    // Verify redirect to login page
    await page.waitForURL("**/login");

    // Verify login form is visible
    const loginForm = await page.isVisible("form.login-form");
    expect(loginForm).toBeTruthy();
  });

  test("should support OAuth authentication flow", async ({ page }) => {
    // Navigate to login page
    await page.click("text=Sign In");

    // Mock OAuth provider response
    await page.route("**/api/auth/oauth/callback**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: "oauth_user_123",
              firstName: "OAuth",
              lastName: "User",
              email: "oauth@example.com",
            },
            tokens: {
              accessToken: "mock_access_token",
              refreshToken: "mock_refresh_token",
            },
          },
        }),
      });
    });

    // Click OAuth button (Google)
    await page.click(".oauth-button-google");

    // Wait for redirect to dashboard after successful OAuth login
    await page.waitForURL("**/dashboard");

    // Verify user is logged in with OAuth account
    const welcomeMessage = await page.textContent(".user-welcome");
    expect(welcomeMessage).toContain("OAuth");
  });
});
