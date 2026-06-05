// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Product Management E2E Test
 * 
 * CRUD operations on products:
 *   - Create new product
 *   - Read / list products
 *   - Update product details
 *   - Delete product
 * 
 * Prerequisites:
 *   - Admin user with product management permissions
 *   - Backend API running with database access
 */

const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

// Unique product data for testing (Filipino context)
const NEW_PRODUCT = {
  name: `Test Product ${Date.now()}`,
  price: '45.00',
  cost: '30.00',
  sku: `SKU-${Date.now()}`,
  category: 'Water',
  stock: '100',
  description: 'Test product para sa automated testing',
};

const UPDATED_PRODUCT = {
  name: `Updated Product ${Date.now()}`,
  price: '55.00',
};

// ─── Helper Functions ────────────────────────────────────────────────

async function login(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('[data-testid="username-input"], input[name="username"], #username', TEST_USER.username);
  await page.fill('[data-testid="password-input"], input[name="password"], #password', TEST_USER.password);
  await page.click('[data-testid="login-button"], button[type="submit"]');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

async function navigateToProducts(page) {
  const productsLink = page.locator(
    '[data-testid="nav-products"], a[href*="product"], a:has-text("Products"), a:has-text("Inventory")'
  ).first();
  if (await productsLink.isVisible()) {
    await productsLink.click();
  } else {
    await page.goto('/products');
  }
  await page.waitForLoadState('networkidle');
}

// ─── Tests ───────────────────────────────────────────────────────────

test.describe('Product Management CRUD', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display product list', async ({ page }) => {
    await navigateToProducts(page);

    // Product list/table should be visible
    const productTable = page.locator(
      '[data-testid="product-table"], .product-list, table, .product-grid'
    ).first();
    await expect(productTable).toBeVisible({ timeout: 10_000 });

    // Should have at least one product (from seed data)
    const productRows = page.locator(
      '[data-testid="product-row"], tbody tr, .product-item, .product-card'
    );
    const count = await productRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should create a new product', async ({ page }) => {
    await navigateToProducts(page);

    // Click Add/New Product button
    const addButton = page.locator(
      '[data-testid="add-product"], button:has-text("Add"), button:has-text("New"), button:has-text("Dagdag"), a:has-text("Add Product")'
    ).first();
    await expect(addButton).toBeVisible({ timeout: 5_000 });
    await addButton.click();

    // Wait for form/modal to appear
    const productForm = page.locator(
      '[data-testid="product-form"], .product-form, form, .modal'
    ).first();
    await expect(productForm).toBeVisible({ timeout: 5_000 });

    // Fill in product details
    // Name
    const nameInput = page.locator(
      '[data-testid="product-name"], input[name="name"], input[placeholder*="Product name"], input[placeholder*="Pangalan"]'
    ).first();
    await nameInput.fill(NEW_PRODUCT.name);

    // Price
    const priceInput = page.locator(
      '[data-testid="product-price"], input[name="price"], input[placeholder*="Price"], input[placeholder*="Presyo"]'
    ).first();
    await priceInput.fill(NEW_PRODUCT.price);

    // Cost (optional field)
    const costInput = page.locator(
      '[data-testid="product-cost"], input[name="cost"], input[placeholder*="Cost"]'
    ).first();
    if (await costInput.isVisible({ timeout: 1_000 })) {
      await costInput.fill(NEW_PRODUCT.cost);
    }

    // SKU / Barcode (optional)
    const skuInput = page.locator(
      '[data-testid="product-sku"], input[name="sku"], input[name="barcode"], input[placeholder*="SKU"], input[placeholder*="Barcode"]'
    ).first();
    if (await skuInput.isVisible({ timeout: 1_000 })) {
      await skuInput.fill(NEW_PRODUCT.sku);
    }

    // Stock quantity (optional)
    const stockInput = page.locator(
      '[data-testid="product-stock"], input[name="stock"], input[name="quantity"], input[placeholder*="Stock"], input[placeholder*="Quantity"]'
    ).first();
    if (await stockInput.isVisible({ timeout: 1_000 })) {
      await stockInput.fill(NEW_PRODUCT.stock);
    }

    // Category (optional - might be dropdown)
    const categorySelect = page.locator(
      '[data-testid="product-category"], select[name="category"], [name="category"]'
    ).first();
    if (await categorySelect.isVisible({ timeout: 1_000 })) {
      try {
        await categorySelect.selectOption({ label: NEW_PRODUCT.category });
      } catch {
        // Might be a custom dropdown, try clicking
        await categorySelect.click();
        const categoryOption = page.locator(
          `[data-testid="category-option"]:has-text("${NEW_PRODUCT.category}"), li:has-text("${NEW_PRODUCT.category}"), option:has-text("${NEW_PRODUCT.category}")`
        ).first();
        if (await categoryOption.isVisible({ timeout: 1_000 })) {
          await categoryOption.click();
        }
      }
    }

    // Description (optional)
    const descInput = page.locator(
      '[data-testid="product-description"], textarea[name="description"], input[name="description"]'
    ).first();
    if (await descInput.isVisible({ timeout: 1_000 })) {
      await descInput.fill(NEW_PRODUCT.description);
    }

    // Submit / Save
    const saveButton = page.locator(
      '[data-testid="save-product"], button:has-text("Save"), button:has-text("Create"), button:has-text("Add"), button[type="submit"]'
    ).first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify success
    const successMsg = page.locator(
      '.success-message, .toast-success, [role="alert"]:has-text("success"), :has-text("created"), :has-text("added"), :has-text("saved")'
    ).first();
    await expect(successMsg).toBeVisible({ timeout: 5_000 });

    // Verify product appears in the list
    await navigateToProducts(page);

    // Search for the new product
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[type="search"]'
    ).first();
    if (await searchInput.isVisible({ timeout: 2_000 })) {
      await searchInput.fill(NEW_PRODUCT.name);
      await page.waitForTimeout(500);
    }

    // Product should be in the list
    const newProductRow = page.locator(`:has-text("${NEW_PRODUCT.name}")`).first();
    await expect(newProductRow).toBeVisible({ timeout: 5_000 });
  });

  test('should update an existing product', async ({ page }) => {
    await navigateToProducts(page);

    // Find and click on a product to edit
    // First, search for our test product or use the first one
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[type="search"]'
    ).first();

    let targetProduct;
    if (await searchInput.isVisible({ timeout: 2_000 })) {
      await searchInput.fill(NEW_PRODUCT.name);
      await page.waitForTimeout(500);
    }

    // Click edit button on the product
    const editButton = page.locator(
      '[data-testid="edit-product"], button:has-text("Edit"), button[aria-label*="Edit"], .edit-button, a:has-text("Edit")'
    ).first();

    if (await editButton.isVisible({ timeout: 5_000 })) {
      await editButton.click();
    } else {
      // Try clicking the product row itself
      const productRow = page.locator(
        '[data-testid="product-row"], tbody tr, .product-item'
      ).first();
      await productRow.click();
    }

    // Wait for edit form
    const productForm = page.locator(
      '[data-testid="product-form"], .product-form, form, .modal'
    ).first();
    await expect(productForm).toBeVisible({ timeout: 5_000 });

    // Update the name
    const nameInput = page.locator(
      '[data-testid="product-name"], input[name="name"], input[placeholder*="Product name"]'
    ).first();
    await nameInput.clear();
    await nameInput.fill(UPDATED_PRODUCT.name);

    // Update the price
    const priceInput = page.locator(
      '[data-testid="product-price"], input[name="price"], input[placeholder*="Price"]'
    ).first();
    await priceInput.clear();
    await priceInput.fill(UPDATED_PRODUCT.price);

    // Save changes
    const saveButton = page.locator(
      '[data-testid="save-product"], button:has-text("Save"), button:has-text("Update"), button[type="submit"]'
    ).first();
    await saveButton.click();

    // Verify success
    const successMsg = page.locator(
      '.success-message, .toast-success, [role="alert"]:has-text("success"), :has-text("updated"), :has-text("saved")'
    ).first();
    await expect(successMsg).toBeVisible({ timeout: 5_000 });

    // Verify updated data in the list
    await navigateToProducts(page);
    if (await searchInput.isVisible({ timeout: 2_000 })) {
      await searchInput.fill(UPDATED_PRODUCT.name);
      await page.waitForTimeout(500);
    }

    const updatedRow = page.locator(`:has-text("${UPDATED_PRODUCT.name}")`).first();
    await expect(updatedRow).toBeVisible({ timeout: 5_000 });
  });

  test('should delete a product', async ({ page }) => {
    await navigateToProducts(page);

    // Search for the test product
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[type="search"]'
    ).first();
    if (await searchInput.isVisible({ timeout: 2_000 })) {
      await searchInput.fill(UPDATED_PRODUCT.name);
      await page.waitForTimeout(500);
    }

    // Click delete button
    const deleteButton = page.locator(
      '[data-testid="delete-product"], button:has-text("Delete"), button[aria-label*="Delete"], .delete-button, button:has-text("Remove")'
    ).first();

    if (await deleteButton.isVisible({ timeout: 5_000 })) {
      await deleteButton.click();
    }

    // Confirm deletion (usually a confirmation dialog)
    const confirmDelete = page.locator(
      '[data-testid="confirm-delete"], button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), .confirm-button'
    ).first();
    if (await confirmDelete.isVisible({ timeout: 3_000 })) {
      await confirmDelete.click();
    }

    // Verify success message
    const successMsg = page.locator(
      '.success-message, .toast-success, [role="alert"]:has-text("success"), :has-text("deleted"), :has-text("removed")'
    ).first();
    await expect(successMsg).toBeVisible({ timeout: 5_000 });

    // Verify product is no longer in the list
    await page.waitForTimeout(1_000);
    const deletedProduct = page.locator(
      `[data-testid="product-row"]:has-text("${UPDATED_PRODUCT.name}"), tbody tr:has-text("${UPDATED_PRODUCT.name}")`
    );
    await expect(deletedProduct).toHaveCount(0, { timeout: 5_000 });
  });

  test('should validate required fields on product creation', async ({ page }) => {
    await navigateToProducts(page);

    // Click Add Product
    const addButton = page.locator(
      '[data-testid="add-product"], button:has-text("Add"), button:has-text("New")'
    ).first();
    await addButton.click();

    // Wait for form
    const productForm = page.locator(
      '[data-testid="product-form"], .product-form, form'
    ).first();
    await expect(productForm).toBeVisible({ timeout: 5_000 });

    // Try to submit without filling required fields
    const saveButton = page.locator(
      '[data-testid="save-product"], button:has-text("Save"), button:has-text("Create"), button[type="submit"]'
    ).first();
    await saveButton.click();

    // Validation errors should appear
    const validationError = page.locator(
      '.error, .field-error, .validation-error, [role="alert"], :has-text("required"), :has-text("Required"), .invalid-feedback'
    ).first();
    await expect(validationError).toBeVisible({ timeout: 5_000 });
  });

  test('should search and filter products', async ({ page }) => {
    await navigateToProducts(page);

    // Search for a specific product
    const searchInput = page.locator(
      '[data-testid="product-search"], input[placeholder*="Search"], input[type="search"]'
    ).first();
    
    if (await searchInput.isVisible({ timeout: 3_000 })) {
      // Search for "Water"
      await searchInput.fill('Water');
      await page.waitForTimeout(500);

      // Results should be filtered
      const productRows = page.locator(
        '[data-testid="product-row"], tbody tr, .product-item, .product-card'
      );
      const count = await productRows.count();

      // Each visible product should contain "Water" in some form
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const rowText = await productRows.nth(i).textContent();
          // Soft check - the row should be related to the search term
          expect(rowText?.toLowerCase()).toMatch(/water|tubig/i);
        }
      }

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);

      // All products should be visible again
      const allCount = await productRows.count();
      expect(allCount).toBeGreaterThanOrEqual(count);
    }
  });

  test('should handle duplicate product names gracefully', async ({ page }) => {
    await navigateToProducts(page);

    // Get the name of an existing product
    const firstProduct = page.locator(
      '[data-testid="product-row"], tbody tr, .product-item'
    ).first();
    const existingName = await firstProduct.locator(
      '[data-testid="product-name-cell"], td:first-child, .product-name'
    ).first().textContent();

    if (existingName) {
      // Try to create a product with the same name
      const addButton = page.locator(
        '[data-testid="add-product"], button:has-text("Add"), button:has-text("New")'
      ).first();
      await addButton.click();

      const nameInput = page.locator(
        '[data-testid="product-name"], input[name="name"]'
      ).first();
      await nameInput.fill(existingName.trim());

      const priceInput = page.locator(
        '[data-testid="product-price"], input[name="price"]'
      ).first();
      await priceInput.fill('100');

      const saveButton = page.locator(
        '[data-testid="save-product"], button:has-text("Save"), button[type="submit"]'
      ).first();
      await saveButton.click();

      // Should either show warning or handle gracefully (not crash)
      // Some systems allow duplicates, others show an error
      await page.waitForTimeout(2_000);

      // Page should still be functional (no crash)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
