import { test, expect } from "@playwright/test";

test.describe("Payment Processing Flow", () => {
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
    await page.goto("http://localhost:3000/payments");
  });

  test("should allow user to create a payment with Stripe", async ({
    page,
  }) => {
    // Click on new payment button
    await page.click('button:has-text("New Payment")');

    // Fill payment form
    await page.fill('input[name="amount"]', "100");
    await page.selectOption('select[name="currency"]', "USD");
    await page.fill('textarea[name="description"]', "Test payment with Stripe");

    // Select Stripe as payment processor
    await page.click('.processor-option:has-text("Stripe")');

    // Mock card details entry (assuming a form appears for card details)
    await page.fill('input[name="cardNumber"]', "4242424242424242");
    await page.fill('input[name="cardExpiry"]', "12/25");
    await page.fill('input[name="cardCvc"]', "123");

    // Submit payment
    await page.click('button:has-text("Process Payment")');

    // Wait for success message
    await page.waitForSelector(".payment-success");

    // Verify success message
    const successMessage = await page.textContent(".payment-success");
    expect(successMessage).toContain("Payment processed successfully");

    // Verify payment appears in payment history
    await page.click('a:has-text("Payment History")');
    const paymentRow = await page.waitForSelector(".payment-row:first-child");
    const paymentAmount = await paymentRow.textContent();
    expect(paymentAmount).toContain("$100.00");
    expect(paymentAmount).toContain("COMPLETED");
  });

  test("should allow user to create a payment with PayPal", async ({
    page,
  }) => {
    // Click on new payment button
    await page.click('button:has-text("New Payment")');

    // Fill payment form
    await page.fill('input[name="amount"]', "150");
    await page.selectOption('select[name="currency"]', "USD");
    await page.fill('textarea[name="description"]', "Test payment with PayPal");

    // Select PayPal as payment processor
    await page.click('.processor-option:has-text("PayPal")');

    // Mock PayPal authentication (assuming a redirect flow)
    await page.route("**/api/payments/paypal/authorize", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            paymentId: "PAYPAL-123",
            approvalUrl: "http://localhost:3000/payments/paypal/return",
          },
        }),
      });
    });

    // Submit payment
    await page.click('button:has-text("Process Payment")');

    // Mock PayPal return
    await page.route("**/api/payments/paypal/capture", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "payment_paypal_123",
            status: "COMPLETED",
            amount: 150,
            currency: "USD",
            processorId: "PAYPAL-123",
          },
        }),
      });
    });

    // Wait for success message
    await page.waitForSelector(".payment-success");

    // Verify success message
    const successMessage = await page.textContent(".payment-success");
    expect(successMessage).toContain("Payment processed successfully");
  });

  test("should handle payment failure gracefully", async ({ page }) => {
    // Click on new payment button
    await page.click('button:has-text("New Payment")');

    // Fill payment form
    await page.fill('input[name="amount"]', "50");
    await page.selectOption('select[name="currency"]', "USD");
    await page.fill('textarea[name="description"]', "Test payment failure");

    // Select Stripe as payment processor
    await page.click('.processor-option:has-text("Stripe")');

    // Mock card details entry with a card that will be declined
    await page.fill('input[name="cardNumber"]', "4000000000000002"); // Decline code
    await page.fill('input[name="cardExpiry"]', "12/25");
    await page.fill('input[name="cardCvc"]', "123");

    // Submit payment
    await page.click('button:has-text("Process Payment")');

    // Wait for error message
    await page.waitForSelector(".payment-error");

    // Verify error message
    const errorMessage = await page.textContent(".payment-error");
    expect(errorMessage).toContain("Your card was declined");
  });

  test("should allow user to view payment details", async ({ page }) => {
    // Navigate to payment history
    await page.click('a:has-text("Payment History")');

    // Click on first payment to view details
    await page.click(".payment-row:first-child");

    // Wait for payment details page
    await page.waitForSelector(".payment-details");

    // Verify payment details are displayed
    const paymentId = await page.textContent(".payment-id");
    expect(paymentId).toBeTruthy();

    const paymentStatus = await page.textContent(".payment-status");
    expect(paymentStatus).toBeTruthy();

    const paymentAmount = await page.textContent(".payment-amount");
    expect(paymentAmount).toBeTruthy();
  });

  test("should allow user to refund a payment", async ({ page }) => {
    // Navigate to payment history
    await page.click('a:has-text("Payment History")');

    // Click on first payment to view details
    await page.click(".payment-row:first-child");

    // Wait for payment details page
    await page.waitForSelector(".payment-details");

    // Click refund button
    await page.click('button:has-text("Refund")');

    // Confirm refund
    await page.click('button:has-text("Confirm Refund")');

    // Wait for success message
    await page.waitForSelector(".refund-success");

    // Verify success message
    const successMessage = await page.textContent(".refund-success");
    expect(successMessage).toContain("Refund processed successfully");

    // Verify payment status is updated
    const paymentStatus = await page.textContent(".payment-status");
    expect(paymentStatus).toContain("REFUNDED");
  });
});
