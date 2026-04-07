import { test, expect } from "@playwright/test";

test.describe("Accounting and Reporting Flow", () => {
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
    await page.goto("http://localhost:3000/accounting");
  });

  test("should allow user to create a journal entry", async ({ page }) => {
    // Click on new journal entry button
    await page.click('button:has-text("New Journal Entry")');

    // Fill journal entry form
    await page.fill('input[name="reference"]', "INV-001");
    await page.fill('input[name="date"]', "2025-05-20");
    await page.fill('textarea[name="description"]', "Sale of goods");

    // Add first ledger entry (debit)
    await page.click('button:has-text("Add Entry")');
    await page.selectOption("select.account-select >> nth=0", "Cash");
    await page.fill('input[name="debit"] >> nth=0', "1000");
    await page.fill('input[name="credit"] >> nth=0', "0");
    await page.fill('input[name="entryDescription"] >> nth=0', "Cash received");

    // Add second ledger entry (credit)
    await page.click('button:has-text("Add Entry")');
    await page.selectOption("select.account-select >> nth=1", "Sales Revenue");
    await page.fill('input[name="debit"] >> nth=1', "0");
    await page.fill('input[name="credit"] >> nth=1', "1000");
    await page.fill(
      'input[name="entryDescription"] >> nth=1',
      "Revenue recorded",
    );

    // Submit journal entry
    await page.click('button:has-text("Save Journal Entry")');

    // Wait for success message
    await page.waitForSelector(".journal-success");

    // Verify success message
    const successMessage = await page.textContent(".journal-success");
    expect(successMessage).toContain("Journal entry created successfully");

    // Verify journal entry appears in the list
    await page.click('a:has-text("Journal Entries")');
    const journalRow = await page.waitForSelector(".journal-row:first-child");
    const journalReference = await journalRow.textContent();
    expect(journalReference).toContain("INV-001");
  });

  test("should validate balanced journal entries", async ({ page }) => {
    // Click on new journal entry button
    await page.click('button:has-text("New Journal Entry")');

    // Fill journal entry form
    await page.fill('input[name="reference"]', "INV-002");
    await page.fill('input[name="date"]', "2025-05-20");
    await page.fill('textarea[name="description"]', "Unbalanced entry");

    // Add first ledger entry (debit)
    await page.click('button:has-text("Add Entry")');
    await page.selectOption("select.account-select >> nth=0", "Cash");
    await page.fill('input[name="debit"] >> nth=0', "1000");
    await page.fill('input[name="credit"] >> nth=0', "0");

    // Add second ledger entry (credit with different amount)
    await page.click('button:has-text("Add Entry")');
    await page.selectOption("select.account-select >> nth=1", "Sales Revenue");
    await page.fill('input[name="debit"] >> nth=1', "0");
    await page.fill('input[name="credit"] >> nth=1', "900"); // Unbalanced

    // Try to submit journal entry
    await page.click('button:has-text("Save Journal Entry")');

    // Wait for error message
    await page.waitForSelector(".journal-error");

    // Verify error message
    const errorMessage = await page.textContent(".journal-error");
    expect(errorMessage).toContain("Journal entries must be balanced");
  });

  test("should generate trial balance report", async ({ page }) => {
    // Navigate to reports section
    await page.click('a:has-text("Reports")');

    // Click on trial balance report
    await page.click('a:has-text("Trial Balance")');

    // Select date for trial balance
    await page.fill('input[name="asOfDate"]', "2025-05-20");

    // Generate report
    await page.click('button:has-text("Generate Report")');

    // Wait for report to load
    await page.waitForSelector(".trial-balance-report");

    // Verify report contains expected elements
    const reportTitle = await page.textContent(".report-title");
    expect(reportTitle).toContain("Trial Balance");

    // Verify totals are equal
    const totalDebit = await page.textContent(".total-debit");
    const totalCredit = await page.textContent(".total-credit");
    expect(totalDebit).toBeTruthy();
    expect(totalCredit).toBeTruthy();
    expect(totalDebit).toEqual(totalCredit);
  });

  test("should generate income statement report", async ({ page }) => {
    // Navigate to reports section
    await page.click('a:has-text("Reports")');

    // Click on income statement report
    await page.click('a:has-text("Income Statement")');

    // Select date range for income statement
    await page.fill('input[name="startDate"]', "2025-01-01");
    await page.fill('input[name="endDate"]', "2025-05-20");

    // Generate report
    await page.click('button:has-text("Generate Report")');

    // Wait for report to load
    await page.waitForSelector(".income-statement-report");

    // Verify report contains expected elements
    const reportTitle = await page.textContent(".report-title");
    expect(reportTitle).toContain("Income Statement");

    // Verify revenue section exists
    const revenueSection = await page.textContent(".revenue-section");
    expect(revenueSection).toContain("Revenue");

    // Verify expenses section exists
    const expensesSection = await page.textContent(".expenses-section");
    expect(expensesSection).toContain("Expenses");

    // Verify net income is calculated
    const netIncome = await page.textContent(".net-income");
    expect(netIncome).toBeTruthy();
  });

  test("should generate balance sheet report", async ({ page }) => {
    // Navigate to reports section
    await page.click('a:has-text("Reports")');

    // Click on balance sheet report
    await page.click('a:has-text("Balance Sheet")');

    // Select date for balance sheet
    await page.fill('input[name="asOfDate"]', "2025-05-20");

    // Generate report
    await page.click('button:has-text("Generate Report")');

    // Wait for report to load
    await page.waitForSelector(".balance-sheet-report");

    // Verify report contains expected elements
    const reportTitle = await page.textContent(".report-title");
    expect(reportTitle).toContain("Balance Sheet");

    // Verify assets section exists
    const assetsSection = await page.textContent(".assets-section");
    expect(assetsSection).toContain("Assets");

    // Verify liabilities section exists
    const liabilitiesSection = await page.textContent(".liabilities-section");
    expect(liabilitiesSection).toContain("Liabilities");

    // Verify equity section exists
    const equitySection = await page.textContent(".equity-section");
    expect(equitySection).toContain("Equity");

    // Verify accounting equation balances
    const totalAssets = await page.textContent(".total-assets");
    const totalLiabilitiesEquity = await page.textContent(
      ".total-liabilities-equity",
    );
    expect(totalAssets).toEqual(totalLiabilitiesEquity);
  });

  test("should export reports to PDF", async ({ page }) => {
    // Navigate to reports section
    await page.click('a:has-text("Reports")');

    // Click on income statement report
    await page.click('a:has-text("Income Statement")');

    // Select date range
    await page.fill('input[name="startDate"]', "2025-01-01");
    await page.fill('input[name="endDate"]', "2025-05-20");

    // Generate report
    await page.click('button:has-text("Generate Report")');

    // Wait for report to load
    await page.waitForSelector(".income-statement-report");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Click export to PDF button
    await page.click('button:has-text("Export to PDF")');

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download started
    expect(download.suggestedFilename()).toContain("income-statement");
    expect(download.suggestedFilename()).toContain(".pdf");
  });
});
