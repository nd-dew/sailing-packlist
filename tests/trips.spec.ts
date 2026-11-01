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
    await page.locator('.trip-menu-option', { hasText: 'Empty packlist' }).click();

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
    expect(yaml).toContain('schema: 1');
    expect(yaml).toContain('name: Day Sail, August, Zeeland Fox 22');
    expect(yaml).toContain('bag:');
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

  test('a packlist file imports as a new packlist, with its bags, notes and progress', async ({ page }) => {
    await openTripMenu(page);
    await page.locator('[data-import-file]').setInputFiles('tests/fixtures/packlist-schema-1.yaml');

    await expect(page.locator('.trip-title')).toContainText('Weekend on the lake');
    await expect(page.locator('.confirm-toast')).toContainText('Imported');
    const rows = page.locator('.list-item');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('.luggage-badge')).toHaveAttribute('title', /^Bag: Backpack/);
    await expect(rows.nth(0).locator('.item-note-hint')).toBeVisible();
    await expect(rows.nth(1)).toHaveClass(/checked/);
    await expect(rows.nth(2).locator('.sub-item-stats')).toHaveText('1/2');
    // the packlist you had is still there
    await openTripMenu(page);
    await expect(page.locator('.trip-option')).toHaveCount(2);
  });

  test('export then import gives the same packlist back', async ({ page }) => {
    await page.locator('.list-item input[type="checkbox"]').nth(1).check();
    const names = await page.locator('.list-item .item-name').allTextContents();

    await openTripMenu(page);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.trip-action', { hasText: 'Export' }).click();
    const path = await (await downloadPromise).path();

    await openTripMenu(page);
    await page.locator('[data-import-file]').setInputFiles(path!);
    await expect(page.locator('.trip-title')).toContainText('Zeeland Fox 22 (2)');
    expect(await page.locator('.list-item .item-name').allTextContents()).toEqual(names);
    await expect(page.locator('#stat-green')).toHaveText('1');
  });

  test('files from a newer app version, or that are not packlists, are refused clearly', async ({ page }) => {
    const messages: string[] = [];
    page.on('dialog', d => { messages.push(d.message()); d.dismiss(); });

    await openTripMenu(page);
    await page.locator('[data-import-file]').setInputFiles({
      name: 'future.yaml', mimeType: 'text/yaml',
      buffer: Buffer.from('schema: 99\nname: From the future\nluggages: []\ncategories: []\n'),
    });
    await expect.poll(() => messages.length).toBe(1);
    expect(messages[0]).toContain('newer version of the app');

    await openTripMenu(page);
    await page.locator('[data-import-file]').setInputFiles({
      name: 'old.yaml', mimeType: 'text/yaml',
      buffer: Buffer.from('version: "1.0"\ncategories: []\n'),
    });
    await expect.poll(() => messages.length).toBe(2);
    expect(messages[1]).toContain('not a packlist file');

    // nothing was added
    await openTripMenu(page);
    await expect(page.locator('.trip-option')).toHaveCount(1);
  });
});
