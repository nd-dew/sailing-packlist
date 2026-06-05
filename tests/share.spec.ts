import { test, expect } from '@playwright/test';

test.describe('Serverless URL Sharing Feature', () => {
  test('loading a shared list from URL hash', async ({ page }) => {
    // Generate an automatic 'confirm' dialog acceptor
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Load Shared List?');
      await dialog.accept();
    });

    // Share link containing renamed luggage ('My Belt'), active categories, item assignments, and custom item ('Shared Drone')
    const shareHash = 'eJy9kc1qwzAQhF8lTK97iBNSGh1tk1tPPQZjZGmdmOjHyFZKCX73IkOj9gXKnnaG_ZhhH7hDFIQRApZ125nInzLodvcKgomXCeL8wKAh0tbuQXDSMgTevzYlmxmEQXkHAe_akcPkHQjKGx8g8FIW27o6YqFfkF2GlFLdRqlumdJl5Qk5nd4ORfkXUmRIHfueTUZo7mVckz0J-2NVVRWWhqDknEqh98HKdDX7eLmCoANPE2sQgrfSzYNKJqvk2VXvo0NDMBDnLf3TpMTrD1Kzj6sMrDd18I6xVoH4idhBFEuzfAN34X_b';
    
    await page.goto(`/#s=${shareHash}`);

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

  test('clicking share setup button copies URL to clipboard and triggers alert', async ({ page }) => {
    let alertTriggered = false;

    // Handle the browser alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('copied to clipboard');
      alertTriggered = true;
      await dialog.dismiss();
    });

    // Hermetically stub the clipboard API to avoid parallel OS clipboard contention
    await page.addInitScript(() => {
      let clipboardBuffer = '';
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            clipboardBuffer = text;
          },
          readText: async () => {
            return clipboardBuffer;
          }
        },
        configurable: true
      });
    });

    await page.goto('/');

    // Open settings menu
    await page.locator('button', { hasText: '☰' }).first().click();
    await expect(page.locator('.side-menu.open')).toBeVisible();

    // Wait for slide-in transition to completely stabilize
    await page.waitForTimeout(500);

    // Tap share button with force to bypass transition intercept issues
    await page.locator('button:has-text("Share Setup with Crew")').click({ force: true });

    // Ensure the dialog popped up
    expect(alertTriggered).toBe(true);

    // Verify clipboard contains the share URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('#s=');
  });
});
