import { test, expect } from '@playwright/test';

test.describe('Serverless URL Sharing Feature', () => {
  test('loading a shared list from URL hash', async ({ page }) => {
    // Share link containing renamed luggage ('My Belt'), active categories, item assignments, and custom item ('Shared Drone')
    const shareHash = 'eJy9kc1qwzAQhF8lTK97iBNSGh1tk1tPPQZjZGmdmOjHyFZKCX73IkOj9gXKnnaG_ZhhH7hDFIQRApZ125nInzLodvcKgomXCeL8wKAh0tbuQXDSMgTevzYlmxmEQXkHAe_akcPkHQjKGx8g8FIW27o6YqFfkF2GlFLdRqlumdJl5Qk5nd4ORfkXUmRIHfueTUZo7mVckz0J-2NVVRWWhqDknEqh98HKdDX7eLmCoANPE2sQgrfSzYNKJqvk2VXvo0NDMBDnLf3TpMTrD1Kzj6sMrDd18I6xVoH4idhBFEuzfAN34X_b';
    
    await page.goto(`/#s=${shareHash}`);

    // Verify custom share confirm overlay is visible
    await expect(page.locator('.share-confirm-overlay')).toBeVisible();

    // Click "Yes, Load" on our beautiful React modal
    await page.locator('button:has-text("Yes, Load")').click();

    // Verify URL Hash has been safely cleaned up from the browser address bar
    await expect(page).not.toHaveURL(/#s=/);

    // Open baggage side panel
    await page.locator('button[title="Baggage"]').first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Verify first luggage card has been renamed to 'My Belt'
    await expect(page.locator('.luggage-card-header').first()).toContainText('My Belt');

    // Close baggage menu
    await page.locator('.right-menu .btn-close-menu').click();

    // Verify that the custom item 'Shared Drone' is present on the page
    const customItem = page.locator('.item-row:has-text("Shared Drone")');
    await expect(customItem).toBeVisible();
  });

  test('clicking share setup button copies URL to clipboard and triggers alert', async ({ page, context }) => {
    await page.goto('/');

    // Grant clipboard-write permissions to browser context
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);

    // Open settings menu
    await page.locator('button', { hasText: '☰' }).first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Wait for slide-in transition to completely stabilize
    await page.waitForTimeout(1000);

    // Setup dialog promise listener
    const dialogPromise = page.waitForEvent('dialog');

    // Tap share button with force to bypass transition intercept issues
    await page.locator('button:has-text("Share Current Setup Link")').click({ force: true });

    // Wait for the async alert to fire and dismiss it
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('copied to clipboard');
    await dialog.dismiss();

    // Verify clipboard contains the share URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('#s=');
  });
});
