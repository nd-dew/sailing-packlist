import { test, expect, type Page } from '@playwright/test';

const openTripMenu = (page: Page) => page.locator('.trip-title').click();

test.describe('Trips', () => {
  test.beforeEach(async ({ page }) => {
    // Clear once per test; reloads inside a test must keep the saved trips
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('cleared')) {
        localStorage.clear();
        sessionStorage.setItem('cleared', '1');
      }
    });
    await page.goto('/');
  });

  test('starting a trip from a preset keeps the other trip and its progress', async ({ page }) => {
    await page.locator('.list-item input[type="checkbox"]').first().check();
    await expect(page.locator('#stat-green')).toHaveText('1');

    await openTripMenu(page);
    await page.locator('.preset-option', { hasText: 'Cyprus' }).locator('.preset-option-main').click();
    await expect(page.locator('.trip-title')).toContainText('Cyprus, October, 5 Nights');
    await expect(page.locator('#stat-green')).toHaveText('0');
    // No "are you sure" dialog anymore
    await expect(page.locator('.share-confirm-overlay')).toHaveCount(0);

    await openTripMenu(page);
    await expect(page.locator('.trip-option')).toHaveCount(2);
    await page.locator('.trip-option', { hasText: 'Zeeland Fox 22' }).click();
    await expect(page.locator('#stat-green')).toHaveText('1');
  });

  test('progress survives a reload, per trip', async ({ page }) => {
    await openTripMenu(page);
    await page.locator('.preset-option', { hasText: 'Cyprus' }).locator('.preset-option-main').click();
    await page.locator('.list-item input[type="checkbox"]').first().check();

    await page.reload();
    await expect(page.locator('.trip-title')).toContainText('Cyprus');
    await expect(page.locator('#stat-green')).toHaveText('1');
  });

  test('an empty trip asks for a name first and starts with no categories', async ({ page }) => {
    await openTripMenu(page);
    await page.locator('.trip-menu-option', { hasText: 'Empty list' }).click();

    const nameInput = page.locator('.trip-title-input');
    await expect(nameInput).toBeFocused();
    await nameInput.fill('Weekend on the Lake');
    await nameInput.press('Enter');

    await expect(page.locator('.trip-title')).toContainText('Weekend on the Lake');
    await expect(page.locator('.list-item')).toHaveCount(0);
    await expect(page.locator('.btn-add-category-block')).toBeVisible();
    await expect(page).toHaveURL(/\/sailing-packlist\/$/);
  });

  test('a trip can be renamed and deleted (with a second tap)', async ({ page }) => {
    await openTripMenu(page);
    await page.locator('.preset-option', { hasText: 'Cyprus' }).locator('.preset-option-main').click();

    await openTripMenu(page);
    await page.locator('.trip-action', { hasText: 'Rename' }).click();
    await page.locator('.trip-title-input').fill('Cyprus with Anna');
    await page.locator('.trip-title-input').press('Enter');
    await expect(page.locator('.trip-title')).toContainText('Cyprus with Anna');

    await openTripMenu(page);
    const del = page.locator('.trip-action', { hasText: 'Delete' });
    await del.click();
    await expect(page.locator('.confirm-toast')).toContainText('Tap again to delete');
    await del.click();

    await expect(page.locator('.trip-title')).toContainText('Zeeland Fox 22');
    await openTripMenu(page);
    await expect(page.locator('.trip-option')).toHaveCount(1);
  });

  test('a trip can be exported as a preset file', async ({ page }) => {
    await openTripMenu(page);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.trip-action', { hasText: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('day_sail_august_zeeland_fox_22.yaml');

    const path = await download.path();
    const fs = await import('fs');
    const yaml = fs.readFileSync(path!, 'utf-8');
    expect(yaml).toContain('name: Day Sail, August, Zeeland Fox 22');
    expect(yaml).toContain('defaultBag:');
    expect(yaml).not.toContain('checked');
  });

  test('a list from before trips existed becomes the first trip', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('legacySeeded')) return;
      sessionStorage.setItem('legacySeeded', '1');
      localStorage.clear();
      // the trips created by the first page load (in beforeEach) must go too
      localStorage.setItem('sailingPacklist_activePresetId_v16', 'cyprus_october');
      localStorage.setItem('sailingPacklist_structure_v16', JSON.stringify([
        { id: 'old_cat', title: 'Old stuff', items: [{ id: 'old_item', name: 'My old item' }] },
      ]));
      localStorage.setItem('sailingPacklist_checked_v16', JSON.stringify({ old_item: true }));
    });
    await page.goto('/');
    await expect(page.locator('.trip-title')).toContainText('Cyprus, October, 5 Nights');
    await expect(page.locator('.list-item .item-name', { hasText: 'My old item' })).toBeVisible();
    await expect(page.locator('#stat-green')).toHaveText('1');
  });
});
