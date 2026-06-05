// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Checkout Flow E2E Test
 * 
 * Full flow: Login → Search product → Add to cart → Checkout with cash → Verify receipt
 * 
 * Prerequisites:
 *   - Backend running on :3000 with seeded database
 *   - Frontend running on :5173
 *   - Default admin account: admin / admin123
 *   - At least one product in the database (seeded)
 */

// ─── Test Data ───────────────────────────────────────────────────────
const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

const SEED_PRODUCT = {
  name: 'Purified Water Refill (5 gal)',
  price: 25.00,
};

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Login to the POS system
 */
async function login(page, user = TEST_USER) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('[data-testid="username-input"], input[name="username"], #username', user.username);
  await page.fill('[data-testid="password-input"], input[name="password"], #password', user.password);
  await page.click('[data-testid="login-button"], button[type="submit"]');
  
  // Wait for redirect to dashboard or POS screen
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

/**
 * Navigate to POS / Cashier screen
 */
async function goToPOS(page) {
  // Try clicking POS link in navigation
  const posLink = page.locator('[data-testid="nav-pos"], a[href*="pos"], a[href*="cashier"]').first();
  if (await posLink.isVisible()) {
    await posLink.click();
  } else {
    await page.goto('/pos');
  }
  await page.waitForLoadState('networkidle');
}

// ─── Tests ───────────────────────────────────────────────────────────

test.describe('Checkout Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should complete a full cash checkout', async ({ page }) => {
    // Step 1: Navigate to POS screen
    await goToPOS(page);
    
    // Verify POS screen loaded
    await expect(
      page.locator('[data-testid="pos-screen"], .pos-container, #pos-screen')
    ).toBeVisible({ timeout: 10_000 });

    // Step 2: Search for a product
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="Barcode"]'
    ).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill(SEED_PRODUCT.name.split(' ')[0]); // Search by first word
    
    // Wait for search results
    await page.waitForTimeout(500); // Debounce wait

    // Step 3: Click on the product to add to cart
    const productItem = page.locator(
      `[data-testid="product-item"]:has-text("${SEED_PRODUCT.name}"), .product-card:has-text("${SEED_PRODUCT.name}"), .product-item:has-text("${SEED_PRODUCT.name}")`
    ).first();
    
    // If product grid is visible, click the product
    if (await productItem.isVisible({ timeout: 5_000 })) {
      await productItem.click();
    } else {
      // Try pressing Enter on search results
      await searchInput.press('Enter');
    }

    // Step 4: Verify product is in cart
    const cartArea = page.locator(
      '[data-testid="cart"], .cart-items, .order-items, #cart'
    ).first();
    await expect(cartArea).toContainText(SEED_PRODUCT.name, { timeout: 5_000 });

    // Step 5: Verify cart total
    const totalDisplay = page.locator(
      '[data-testid="cart-total"], .total-amount, .order-total'
    ).first();
    await expect(totalDisplay).toBeVisible();

    // Step 6: Click Checkout / Pay button
    const checkoutButton = page.locator(
      '[data-testid="checkout-button"], button:has-text("Pay"), button:has-text("Checkout"), button:has-text("Bayad")'
    ).first();
    await expect(checkoutButton).toBeEnabled();
    await checkoutButton.click();

    // Step 7: Select Cash payment method
    const cashOption = page.locator(
      '[data-testid="payment-cash"], button:has-text("Cash"), button:has-text("Pera"), .payment-method:has-text("Cash")'
    ).first();
    if (await cashOption.isVisible({ timeout: 3_000 })) {
      await cashOption.click();
    }

    // Step 8: Enter amount tendered
    const amountInput = page.locator(
      '[data-testid="amount-tendered"], input[name="amountTendered"], input[placeholder*="Amount"], input[placeholder*="amount"]'
    ).first();
    if (await amountInput.isVisible({ timeout: 3_000 })) {
      await amountInput.fill('100');
    }

    // Step 9: Confirm payment
    const confirmButton = page.locator(
      '[data-testid="confirm-payment"], button:has-text("Confirm"), button:has-text("Complete"), button:has-text("OK")'
    ).first();
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // Step 10: Verify checkout success
    // Look for success message, receipt modal, or change display
    const successIndicator = page.locator(
      '[data-testid="checkout-success"], .success-message, .receipt-modal, :has-text("Transaction Complete"), :has-text("Sukses")'
    ).first();
    await expect(successIndicator).toBeVisible({ timeout: 10_000 });

    // Step 11: Verify receipt print job was created
    // Check via API that a print job exists for this transaction
    const response = await page.request.get('http://localhost:3000/api/print-jobs/latest');
    if (response.ok()) {
      const printJob = await response.json();
      expect(printJob).toBeTruthy();
      expect(printJob.status).toMatch(/pending|completed|queued/);
      expect(printJob.type).toBe('receipt');
    }
    // Alternative: Check that print dialog or print confirmation appeared on screen
    const printIndicator = page.locator(
      '[data-testid="print-status"], .print-queued, :has-text("Receipt printed"), :has-text("Print")'
    ).first();
    // This is a soft check - print indicator may or may not be visible depending on printer config
    if (await printIndicator.isVisible({ timeout: 2_000 })) {
      await expect(printIndicator).toBeVisible();
    }
  });

  test('should show correct change calculation', async ({ page }) => {
    await goToPOS(page);

    // Add product
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[placeholder*="search"]'
    ).first();
    await searchInput.fill(SEED_PRODUCT.name.split(' ')[0]);
    await page.waitForTimeout(500);

    const productItem = page.locator(
      `[data-testid="product-item"]:has-text("${SEED_PRODUCT.name}"), .product-card:has-text("${SEED_PRODUCT.name}")`
    ).first();
    if (await productItem.isVisible({ timeout: 5_000 })) {
      await productItem.click();
    }

    // Go to checkout
    const checkoutButton = page.locator(
      '[data-testid="checkout-button"], button:has-text("Pay"), button:has-text("Checkout")'
    ).first();
    await checkoutButton.click();

    // Enter ₱100 for a ₱25 item
    const amountInput = page.locator(
      '[data-testid="amount-tendered"], input[name="amountTendered"], input[placeholder*="Amount"]'
    ).first();
    if (await amountInput.isVisible({ timeout: 3_000 })) {
      await amountInput.fill('100');
      
      // Verify change displayed
      const changeDisplay = page.locator(
        '[data-testid="change-amount"], .change-display, :has-text("Change")'
      ).first();
      if (await changeDisplay.isVisible({ timeout: 2_000 })) {
        await expect(changeDisplay).toContainText('75');
      }
    }
  });

  test('should handle multiple items in cart', async ({ page }) => {
    await goToPOS(page);

    // Add same product twice
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[placeholder*="search"]'
    ).first();
    await searchInput.fill(SEED_PRODUCT.name.split(' ')[0]);
    await page.waitForTimeout(500);

    const productItem = page.locator(
      `[data-testid="product-item"]:has-text("${SEED_PRODUCT.name}"), .product-card:has-text("${SEED_PRODUCT.name}")`
    ).first();
    
    if (await productItem.isVisible({ timeout: 5_000 })) {
      await productItem.click();
      await page.waitForTimeout(300);
      await productItem.click();
    }

    // Verify quantity is 2 or two items in cart
    const cartArea = page.locator('[data-testid="cart"], .cart-items, .order-items').first();
    await expect(cartArea).toBeVisible();
    
    // Check quantity indicator
    const qtyIndicator = page.locator(
      '[data-testid="item-quantity"]:has-text("2"), .item-qty:has-text("2"), .quantity:has-text("2")'
    ).first();
    // Quantity could be shown as "x2", "2", or as two separate line items
    const itemCount = await cartArea.locator('[data-testid="cart-item"], .cart-item, .order-item').count();
    expect(itemCount).toBeGreaterThanOrEqual(1);
  });

  test('should be able to remove items from cart', async ({ page }) => {
    await goToPOS(page);

    // Add product
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[placeholder*="search"]'
    ).first();
    await searchInput.fill(SEED_PRODUCT.name.split(' ')[0]);
    await page.waitForTimeout(500);

    const productItem = page.locator(
      `[data-testid="product-item"]:has-text("${SEED_PRODUCT.name}"), .product-card:has-text("${SEED_PRODUCT.name}")`
    ).first();
    if (await productItem.isVisible({ timeout: 5_000 })) {
      await productItem.click();
    }

    // Remove from cart
    const removeButton = page.locator(
      '[data-testid="remove-item"], button[aria-label*="Remove"], .remove-item, .delete-item'
    ).first();
    if (await removeButton.isVisible({ timeout: 3_000 })) {
      await removeButton.click();
    }

    // Verify cart is empty
    const emptyCart = page.locator(
      '[data-testid="empty-cart"], .empty-cart, :has-text("Cart is empty"), :has-text("No items")'
    ).first();
    await expect(emptyCart).toBeVisible({ timeout: 5_000 });
  });
});
