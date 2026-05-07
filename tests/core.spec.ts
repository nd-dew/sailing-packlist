import { test, expect } from '@playwright/test';

test.describe('Core App Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure default state from preset
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');
  });

  test('initial render and stats display correctly', async ({ page }) => {
    // Header should be visible
    await expect(page.locator('.app-header')).toBeVisible();
    
    // There should be items in the list
    const items = page.locator('.list-item');
    await expect(items).toHaveCount(await items.count()); // Just ensuring it finds them
    expect(await items.count()).toBeGreaterThan(10);

    // Initial stats should be 0 packed
    const packedCounter = page.locator('#stat-green');
    await expect(packedCounter).toHaveText('0');
  });

  test('checking an item updates stats and UI', async ({ page }) => {
    const firstItem = page.locator('.list-item').first();
    const checkbox = firstItem.locator('input[type="checkbox"]');
    const packedCounter = page.locator('#stat-green');

    // Ensure it's unchecked initially
    await expect(checkbox).not.toBeChecked();

    // Check it
    await checkbox.check();

    // Verify UI updates
    await expect(checkbox).toBeChecked();
    await expect(firstItem).toHaveClass(/checked/);
    await expect(packedCounter).toHaveText('1');

    // Uncheck it
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await expect(packedCounter).toHaveText('0');
  });

  test('hiding an item moves it to the hidden section', async ({ page }) => {
    const firstItem = page.locator('.list-item').first();
    const itemName = await firstItem.locator('.item-name').innerText();
    const hideBtn = firstItem.locator('.btn-hide');

    // Hide the item
    await hideBtn.click();

    // Verify it's no longer in the main active list
    // Since we just clicked the first item of the first category, we check that specific row is gone
    await expect(page.locator('.list-item:not(.grayed-out) .item-name', { hasText: itemName })).toBeHidden();

    // Find the category's hidden badge and click it to reveal
    const hiddenBadge = page.locator('.badge-hidden').first();
    await expect(hiddenBadge).toBeVisible();
    await expect(hiddenBadge).toContainText('1 hidden');
    await hiddenBadge.click();

    // Verify it appears in the grayed-out section
    const hiddenItemRow = page.locator('.list-item.grayed-out .item-name', { hasText: itemName });
    await expect(hiddenItemRow).toBeVisible();

    // Unhide it
    await page.locator('.list-item.grayed-out .btn-unhide').first().click();
    await expect(hiddenBadge).toBeHidden();
  });

  test('opening and closing item modal works', async ({ page }) => {
    const firstItemClickable = page.locator('.list-item .item-clickable-area').first();
    const itemName = await firstItemClickable.locator('.item-name').innerText();
    
    // Open modal
    await firstItemClickable.click();

    const modal = page.locator('.item-card-modal');
    await expect(modal).toBeVisible();

    // Verify modal title matches
    const modalInput = modal.locator('.modal-title-input');
    await expect(modalInput).toHaveValue(itemName);

    // Close modal
    await page.locator('.btn-close-modal').first().click();
    await expect(modal).toBeHidden();
  });

  test('undo and redo buttons revert and re-apply actions', async ({ page }) => {
    const undoBtn = page.locator('button[title="Undo"]');
    const redoBtn = page.locator('button[title="Redo"]');
    const checkbox = page.locator('.list-item input[type="checkbox"]').first();

    // Initially undo/redo should be disabled
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeDisabled();

    // Action 1: Check an item
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(undoBtn).toBeEnabled();

    // Undo Action 1
    await undoBtn.click();
    await expect(checkbox).not.toBeChecked();
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();

    // Redo Action 1
    await redoBtn.click();
    await expect(checkbox).toBeChecked();
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();
  });
});
