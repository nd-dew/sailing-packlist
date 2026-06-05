import { test, expect } from '@playwright/test';

test.describe('Category Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure default state
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');
  });

  test('clicking category title opens modal', async ({ page }) => {
    // Find the first category header
    const firstCatHeader = page.locator('.category-header h3').first();
    const catTitle = (await firstCatHeader.textContent())?.trim();
    
    // Click it
    await firstCatHeader.click();

    // Verify modal is open and has the category title in the input
    const modalInput = page.locator('.item-card-modal .modal-title-input');
    await expect(modalInput).toBeVisible();
    await expect(modalInput).toHaveValue(catTitle);
  });

  test('bulk pack & hide action works', async ({ page }) => {
    const firstCatHeader = page.locator('.category-header h3').first();
    await firstCatHeader.click();

    const packHideBtn = page.locator('button:has-text("Pack & Hide All Items")');
    await expect(packHideBtn).toBeVisible();
    await packHideBtn.click();

    // The modal should close
    await expect(page.locator('.item-card-modal')).toBeHidden();

    // The category header should turn green (done class)
    const headerContainer = page.locator('.category-header').first();
    await expect(headerContainer).toHaveClass(/done/);
    
    // The items inside should be hidden, replacing the list with the 'X hidden' badge
    const hiddenBadge = page.locator('.badge-hidden').first();
    await expect(hiddenBadge).toBeVisible();
    await expect(hiddenBadge).toContainText('hidden');
  });

  test('renaming category updates UI immediately', async ({ page }) => {
    const firstCatHeader = page.locator('.category-header h3').first();
    await firstCatHeader.click();

    const modalInput = page.locator('.item-card-modal .modal-title-input');
    await modalInput.fill('My Custom Category');

    // Close modal
    await page.locator('.btn-close-modal').click();

    // Verify UI updated
    await expect(firstCatHeader).toHaveText('My Custom Category');
  });

  test('can create custom category', async ({ page }) => {
    // Locate the Add Category card button inside the checklist column
    const addCatBtn = page.locator('.btn-add-category-block h3:has-text("Add Category")');
    await expect(addCatBtn).toBeVisible();

    // Click it instantly
    await addCatBtn.click();

    // Verify a new category block named 'New Category' is visible on the main list
    const newCat = page.locator('.category-header h3:has-text("New Category")');
    await expect(newCat).toBeVisible();
  });
});
