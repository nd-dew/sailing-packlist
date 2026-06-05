import { test, expect } from '@playwright/test';

test.describe('Settings Menu & Luggage Modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');
  });

  test('can toggle dark mode from settings', async ({ page }) => {
    // Open settings
    await page.locator('button', { hasText: '☰' }).first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Default theme check
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');

    // Click dark theme toggle button (displays '🌙' when theme is light)
    await page.locator('button', { hasText: '🌙' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');

    // Click light theme toggle button (displays '☀️' when theme is dark)
    await page.locator('button', { hasText: '☀️' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  });

  test('can increment and decrement expected showers', async ({ page }) => {
    await page.locator('button', { hasText: '☰' }).first().click();
    
    const stepperInput = page.locator('.stepper-input');
    await expect(stepperInput).toBeVisible();
    
    const initialVal = parseInt(await stepperInput.inputValue());
    
    // Increment
    await page.locator('.stepper-btn', { hasText: '+' }).click();
    await expect(stepperInput).toHaveValue(String(initialVal + 1));
    
    // Decrement
    await page.locator('.stepper-btn', { hasText: '−' }).click();
    await expect(stepperInput).toHaveValue(String(initialVal));
  });

  test('opening and editing a bag modal', async ({ page }) => {
    // Open Baggage Menu
    await page.locator('button[title="Baggage"]').first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Click edit on the first bag (On Person)
    await page.locator('.luggage-card-header button', { hasText: '✎ Edit' }).first().click();
    
    const bagModal = page.locator('.item-card-modal');
    await expect(bagModal).toBeVisible();

    // Change bag name
    const titleInput = bagModal.locator('.modal-title-input');
    await expect(titleInput).toHaveValue('On me');
    await titleInput.fill('My Pockets');

    // Close bag modal
    await bagModal.locator('.btn-close-modal').click();
    await expect(bagModal).toBeHidden();

    // Verify name changed in baggage menu
    await expect(page.locator('.luggage-card-header').first()).toContainText('My Pockets');
  });

  test('applying a preset triggers custom reset warning modal', async ({ page }) => {
    // Open settings
    await page.locator('button', { hasText: '☰' }).first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Click Apply: Crew
    await page.locator('button:has-text("Apply: Crew")').click();

    // Verify beautiful warning modal is visible
    const warningModal = page.locator('.share-confirm-card.warning-card');
    await expect(warningModal).toBeVisible();
    await expect(warningModal.locator('h3')).toHaveText('Factory Reset List?');

    // Click Cancel
    await warningModal.locator('button:has-text("Cancel")').click();
    await expect(warningModal).toBeHidden();

    // Re-trigger and Confirm reset
    await page.locator('button:has-text("Apply: Crew")').click();
    await expect(warningModal).toBeVisible();
    await warningModal.locator('button:has-text("Yes, Reset")').click();

    // Verify warning modal is closed and settings side panel is closed
    await expect(warningModal).toBeHidden();
    await expect(page.locator('.side-menu.open')).toBeHidden();
  });
});
