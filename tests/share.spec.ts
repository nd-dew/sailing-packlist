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

  test('copying and loading preset direct URLs', async ({ page, context }) => {
    await page.goto('/');

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);

    // Setup automatic dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('copied to clipboard');
      await dialog.dismiss();
    });

    // Open settings menu
    await page.locator('button', { hasText: '☰' }).first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Wait for slide-in transition to stabilize
    await page.waitForTimeout(1000);

    // Click the 🔗 button next to select dropdown (by default med_blueward_26 is selected)
    await page.locator('.preset-selectors button:has-text("🔗")').click({ force: true });

    // Verify clipboard contains #p=med_blueward_26
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('#p=med_blueward_26');

    // Directly load the Zeeland preset URL hash
    await page.goto('/#p=zeeland_fox_22');

    // Verify Preset Detected overlay is visible
    const presetOverlay = page.locator('.share-confirm-overlay');
    await expect(presetOverlay).toBeVisible();
    await expect(presetOverlay.locator('h3')).toHaveText('Preset Detected');

    // Click "Load as Crew"
    await page.locator('button:has-text("Load as Crew")').click();

    // Verify overlay is closed and hash cleared
    await expect(presetOverlay).toBeHidden();
    await expect(page).not.toHaveURL(/#p=/);

    // Verify items of Zeeland Fox 22 are loaded
    await expect(page.locator('body')).toContainText('Windproof or waterproof jacket');
  });
});
