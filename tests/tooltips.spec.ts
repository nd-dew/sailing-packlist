import { test, expect } from '@playwright/test';

// Tooltips are for mouse users: run these as a desktop browser
test.use({ isMobile: false, hasTouch: false, viewport: { width: 1280, height: 800 } });

test.describe('Hover tooltips', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');
  });

  test('show instantly, say what undo will undo, and give the title back afterwards', async ({ page }) => {
    const tip = page.locator('.hover-tip');
    const undo = page.locator('button[aria-label="Undo"]');

    await page.locator('button[aria-label="Baggage"]').hover();
    // no waiting for the browser's slow native tooltip: ours is there right away
    await expect(tip).toHaveText('Bags and what goes in them', { timeout: 300 });

    await page.locator('.list-item input[type="checkbox"]').first().check();
    await undo.hover();
    await expect(tip).toContainText('Undo: Checked');

    // While hovered the native title is parked, after leaving it's restored
    await expect(undo).not.toHaveAttribute('title');
    await page.mouse.move(640, 700);
    await expect(tip).toHaveCount(0);
    await expect(undo).toHaveAttribute('title', /Undo: Checked/);
  });

  test('the bag chip tells where the item is and where a click moves it', async ({ page }) => {
    await page.locator('.list-item .luggage-badge').first().hover();
    await expect(page.locator('.hover-tip')).toContainText(/^Bag: .+ · click: put in /);
  });
});
