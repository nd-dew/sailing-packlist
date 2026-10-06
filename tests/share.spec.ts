import { test, expect, type Page } from '@playwright/test';

// Start clean once per test; later navigations inside a test keep the saved trips
const freshStart = async (page: Page) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('cleared')) {
      localStorage.clear();
      sessionStorage.setItem('cleared', '1');
    }
  });
};

const tripNames = async (page: Page) => {
  await page.locator('.trip-title').click();
  const names = await page.locator('.trip-option .trip-menu-name').allInnerTexts();
  await page.keyboard.press('Escape');
  return names;
};

const SHARE_HASH = 'eJy9kc1qwzAQhF8lTK97iBNSGh1tk1tPPQZjZGmdmOjHyFZKCX73IkOj9gXKnnaG_ZhhH7hDFIQRApZ125nInzLodvcKgomXCeL8wKAh0tbuQXDSMgTevzYlmxmEQXkHAe_akcPkHQjKGx8g8FIW27o6YqFfkF2GlFLdRqlumdJl5Qk5nd4ORfkXUmRIHfueTUZo7mVckz0J-2NVVRWWhqDknEqh98HKdDX7eLmCoANPE2sQgrfSzYNKJqvk2VXvo0NDMBDnLf3TpMTrD1Kzj6sMrDd18I6xVoH4idhBFEuzfAN34X_b';

test.describe('Links: shared lists and presets', () => {
  test.beforeEach(async ({ page }) => freshStart(page));

  test('a shared link opens as a new trip, without overwriting the current one', async ({ page }) => {
    await page.goto('');
    const before = await tripNames(page);

    await page.goto(`#s=${SHARE_HASH}`);
    await page.reload();
    await expect(page.locator('.confirm-toast')).toContainText('Opened the shared packlist');
    await expect(page).not.toHaveURL(/#s=/);

    // The shared content is there
    await expect(page.locator('.item-row:has-text("Shared Drone")')).toBeVisible();
    await page.locator('button[aria-label="Baggage"]').first().click();
    await expect(page.locator('.luggage-card-header').first()).toContainText('My Belt');
    await page.locator('.right-menu .btn-close-menu').click();

    // ...as an extra trip next to the one we had
    const after = await tripNames(page);
    expect(after.length).toBe(before.length + 1);

    // Opening the same link again goes back to that trip instead of adding another
    await page.goto(`#s=${SHARE_HASH}`);
    await page.reload();
    await expect(page.locator('.item-row:has-text("Shared Drone")')).toBeVisible();
    expect((await tripNames(page)).length).toBe(after.length);
  });

  test('sharing a trip copies a link that recreates it', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);
    await page.goto('');

    // Make the trip recognisable: add an item
    const add = page.locator('.category-block').first().locator('.add-item-input');
    await add.fill('Lucky hat');
    await add.press('Enter');

    await page.locator('.trip-title').click();
    await page.locator('.trip-action', { hasText: 'Share' }).click();
    await expect(page.locator('.confirm-toast')).toContainText('copied');
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('/sailing-packlist/#s=');

    // A friend opening the link gets the same list, named after the trip
    const friend = await context.newPage();
    await friend.goto(link);
    await expect(friend.locator('.item-row:has-text("Lucky hat")')).toBeVisible();
    await expect(friend.locator('.trip-title')).toContainText('Zeeland Fox 22');
  });

  test('address bar and tab title follow the open trip', async ({ page }) => {
    await page.goto('');
    await expect(page).toHaveURL(/\/sailing-packlist\/zeeland_fox_22$/);
    await expect(page).toHaveTitle(/Zeeland Fox 22/);
    await expect(page.locator('.trip-title')).toContainText('Zeeland Fox 22');
  });

  test('a preset link starts a trip from it, and later opens that same trip', async ({ page }) => {
    await page.goto('');
    // Some progress on the current trip
    await page.locator('.list-item input[type="checkbox"]').first().check();

    await page.goto('cyprus_october');
    await expect(page.locator('.trip-title')).toContainText('Cyprus, October, 5 Nights');
    await expect(page).toHaveURL(/\/cyprus_october$/);
    await expect(page.locator('#stat-green')).toHaveText('0');
    await page.locator('.list-item input[type="checkbox"]').nth(1).check();

    // The previous trip kept its progress
    await page.locator('.trip-title').click();
    await page.locator('.trip-option', { hasText: 'Zeeland Fox 22' }).click();
    await expect(page.locator('#stat-green')).toHaveText('1');

    // Opening the Cyprus link again goes back to the Cyprus trip, no duplicate
    await page.goto('cyprus_october');
    await expect(page.locator('.trip-title')).toContainText('Cyprus');
    await expect(page.locator('#stat-green')).toHaveText('1');
    expect((await tripNames(page)).length).toBe(2);

    // Old #p= links behave the same
    await page.goto('#p=zeeland_fox_22');
    await page.reload();
    await expect(page.locator('.trip-title')).toContainText('Zeeland Fox 22');
    await expect(page).not.toHaveURL(/#p=/);
  });

  test('a link to a preset with crew/captain lists asks which one', async ({ page }) => {
    await page.goto('med_blueward_26');
    const card = page.locator('.role-card');
    await expect(card).toContainText('Mediterranean - BlueWard 26');

    // "Not now" keeps the current trip
    await card.locator('.btn-role-skip').click();
    await expect(card).toBeHidden();
    await expect(page).toHaveURL(/\/zeeland_fox_22$/);

    await page.goto('med_blueward_26');
    await card.locator('button', { hasText: 'Captain' }).click();
    await expect(page.locator('.trip-title')).toContainText('BlueWard 26 (captain)');
    await expect(page).toHaveURL(/\/med_blueward_26$/);

    // Reloading the page stays on that trip without asking again
    await page.reload();
    await expect(page.locator('.list-item').first()).toBeVisible();
    await expect(card).toBeHidden();
  });
});
