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
    // Open settings menu
    await page.locator('button', { hasText: '☰' }).first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Wait for slide-in transition to completely stabilize
    await page.waitForTimeout(500);

    // Fill in new category title
    const input = page.locator('input[placeholder="e.g. Fishing Gear, Electronics"]');
    await input.fill('Fishing Gear');

    // Click Add
    await page.locator('.menu-section button:has-text("Add")').click({ force: true });

    // Verify side menu is closed
    await expect(page.locator('.side-menu.open')).toBeHidden();

    // Verify the new category block is visible on the main list
    const newCat = page.locator('.category-header h3:has-text("Fishing Gear")');
    await expect(newCat).toBeVisible();
  });
});
