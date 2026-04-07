import { test, expect } from "@playwright/test";

test.describe("Dashboard Functionality", () => {
  // Login before all tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
    await page.context().storageState({ path: "auth.json" });
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Use saved authentication state
    await page.context().addCookies([
      {
        name: "accessToken",
        value: "mock_access_token",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("http://localhost:3000/dashboard");
  });

  test("should display all dashboard KPI cards with correct data", async ({
    page,
  }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Verify all KPI cards are present
    const revenueCard = await page.isVisible('[data-testid="revenue-card"]');
    const expensesCard = await page.isVisible('[data-testid="expenses-card"]');
    const profitCard = await page.isVisible('[data-testid="profit-card"]');
    const cashFlowCard = await page.isVisible('[data-testid="cash-flow-card"]');

    expect(revenueCard).toBeTruthy();
    expect(expensesCard).toBeTruthy();
    expect(profitCard).toBeTruthy();
    expect(cashFlowCard).toBeTruthy();

    // Verify KPI cards contain numeric values
    const revenueValue = await page.textContent(
      '[data-testid="revenue-value"]',
    );
    const expensesValue = await page.textContent(
      '[data-testid="expenses-value"]',
    );
    const profitValue = await page.textContent('[data-testid="profit-value"]');
    const cashFlowValue = await page.textContent(
      '[data-testid="cash-flow-value"]',
    );

    expect(revenueValue).toMatch(/\$[\d,]+(\.\d{2})?/);
    expect(expensesValue).toMatch(/\$[\d,]+(\.\d{2})?/);
    expect(profitValue).toMatch(/\$[\d,]+(\.\d{2})?/);
    expect(cashFlowValue).toMatch(/\$[\d,]+(\.\d{2})?/);
  });

  test("should display charts and visualizations", async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Verify charts are present
    const revenueChart = await page.isVisible('[data-testid="revenue-chart"]');
    const expenseBreakdownChart = await page.isVisible(
      '[data-testid="expense-breakdown-chart"]',
    );
    const cashFlowChart = await page.isVisible(
      '[data-testid="cash-flow-chart"]',
    );

    expect(revenueChart).toBeTruthy();
    expect(expenseBreakdownChart).toBeTruthy();
    expect(cashFlowChart).toBeTruthy();

    // Verify chart elements (e.g., bars, lines, legends)
    const chartElements = await page.$$(".recharts-layer");
    expect(chartElements.length).toBeGreaterThan(0);
  });

  test("should update dashboard data when changing date range", async ({
    page,
  }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Get initial KPI values
    const initialRevenueValue = await page.textContent(
      '[data-testid="revenue-value"]',
    );

    // Change date range
    await page.click(".date-range-selector");
    await page.click("text=Last Quarter");

    // Wait for dashboard to update
    await page.waitForTimeout(1000); // Allow time for data to refresh

    // Get updated KPI values
    const updatedRevenueValue = await page.textContent(
      '[data-testid="revenue-value"]',
    );

    // Values should be different after changing date range
    expect(initialRevenueValue).not.toEqual(updatedRevenueValue);
  });

  test("should display recent transactions section", async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Verify recent transactions section is present
    const transactionsSection = await page.isVisible(".recent-transactions");
    expect(transactionsSection).toBeTruthy();

    // Verify transactions are listed
    const transactionItems = await page.$$(".transaction-item");
    expect(transactionItems.length).toBeGreaterThan(0);
  });

  test("should navigate to detailed views when clicking on KPI cards", async ({
    page,
  }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Click on revenue card
    await page.click('[data-testid="revenue-card"]');

    // Verify navigation to revenue details page
    await page.waitForURL("**/analytics/revenue");

    // Go back to dashboard
    await page.goto("http://localhost:3000/dashboard");

    // Click on expenses card
    await page.click('[data-testid="expenses-card"]');

    // Verify navigation to expenses details page
    await page.waitForURL("**/analytics/expenses");
  });

  test("should filter transactions by type", async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Get initial transaction count
    const initialTransactionCount = (await page.$$(".transaction-item")).length;

    // Open filter dropdown
    await page.click(".transaction-filter");

    // Select income only
    await page.click("text=Income Only");

    // Wait for transactions to update
    await page.waitForTimeout(500);

    // Get filtered transaction count
    const filteredTransactionCount = (await page.$$(".transaction-item"))
      .length;

    // Filtered count should be different (less than or equal to initial count)
    expect(filteredTransactionCount).toBeLessThanOrEqual(
      initialTransactionCount,
    );

    // Verify all visible transactions are income type
    const transactionTypes = await page.$$eval(
      ".transaction-type",
      (elements) => elements.map((el) => el.textContent),
    );

    for (const type of transactionTypes) {
      expect(type).toContain("Income");
    }
  });

  test("should display payment processor analytics", async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Navigate to payment analytics section
    await page.click("text=Payment Analytics");

    // Verify payment processor breakdown is displayed
    await page.waitForSelector(".processor-breakdown");

    // Verify processor chart is present
    const processorChart = await page.isVisible(
      '[data-testid="processor-chart"]',
    );
    expect(processorChart).toBeTruthy();

    // Verify processor statistics are present
    const stripeStats = await page.textContent(
      '.processor-stats:has-text("Stripe")',
    );
    const paypalStats = await page.textContent(
      '.processor-stats:has-text("PayPal")',
    );

    expect(stripeStats).toBeTruthy();
    expect(paypalStats).toBeTruthy();
  });

  test("should export dashboard data", async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Click export button
    await page.click('button:has-text("Export")');

    // Select export format
    await page.click("text=Export as CSV");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Confirm export
    await page.click('button:has-text("Confirm Export")');

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download started
    expect(download.suggestedFilename()).toContain("dashboard-data");
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("should refresh dashboard data", async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector(".dashboard-container");

    // Get initial last updated timestamp
    const initialTimestamp = await page.textContent(".last-updated");

    // Click refresh button
    await page.click('button:has-text("Refresh")');

    // Wait for refresh to complete
    await page.waitForTimeout(1000);

    // Get updated timestamp
    const updatedTimestamp = await page.textContent(".last-updated");

    // Timestamps should be different after refresh
    expect(initialTimestamp).not.toEqual(updatedTimestamp);
  });
});
