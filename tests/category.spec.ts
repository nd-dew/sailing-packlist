import { test, expect } from '@playwright/test';

test.describe('Categories', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure default state
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');
  });

  test('clicking the title renames the category in place', async ({ page }) => {
    const title = page.locator('.category-header h3').first();
    await title.click();
    const input = page.locator('.category-title-input');
    await expect(input).toBeFocused();
    await input.fill('My Custom Category');
    await input.press('Enter');
    await expect(page.locator('.category-header h3').first()).toHaveText('My Custom Category');
    // no modal anywhere
    await expect(page.locator('.modal-overlay')).toHaveCount(0);
  });

  test('Esc while renaming puts the old name back', async ({ page }) => {
    const title = page.locator('.category-header h3').first();
    const original = (await title.textContent())!;
    await title.click();
    await page.locator('.category-title-input').fill('Oops');
    await page.locator('.category-title-input').press('Escape');
    await expect(page.locator('.category-header h3').first()).toHaveText(original);
  });

  test('right-click opens the category menu; pack all folds the category away', async ({ page }) => {
    await page.locator('.category-header').first().click({ button: 'right' });
    const menu = page.locator('.category-menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Pack all', exact: true }).click();
    await expect(menu).toBeHidden();

    await expect(page.locator('.category-header').first()).toHaveClass(/done/);
    await expect(page.locator('.category-block').first()).toHaveClass(/is-collapsed/);
  });

  test('the category menu puts every item in one bag', async ({ page }) => {
    await page.locator('.category-header').first().click({ button: 'right' });
    const bagButton = page.locator('.category-menu .category-menu-btn.bag').last();
    const bagName = (await bagButton.textContent())!.trim();
    await bagButton.click();
    const titles = await page.locator('.category-block').first().locator('.list-item .luggage-badge').evaluateAll(
      els => els.map(el => el.getAttribute('title') ?? '')
    );
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) expect(t).toContain(`Bag: ${bagName}`);
  });

  test('deleting a category from its menu needs a second tap', async ({ page }) => {
    const firstTitle = (await page.locator('.category-header h3').first().textContent())!;
    await page.locator('.category-header').first().click({ button: 'right' });
    const del = page.locator('.category-menu .category-menu-btn.danger');
    await del.click();
    await expect(del).toContainText('Tap again');
    await expect(page.locator('.category-header h3').first()).toHaveText(firstTitle);
    await del.click();
    await expect(page.locator('.category-header h3', { hasText: firstTitle })).toHaveCount(0);
  });

  test('clicking the stars sets the priority; priorities can be hidden', async ({ page }) => {
    const stars = page.locator('.category-block').first().locator('.stars-badge');
    await stars.click();
    await page.locator('.priority-popover .priority-option', { hasText: 'Must have' }).click();
    await expect(stars).toHaveText('★★★');

    await page.locator('button', { hasText: '☰' }).first().click();
    await page.locator('button[aria-label="Show priorities"]').click();
    await page.locator('.left-menu .btn-close-menu').click();
    await expect(page.locator('.stars-badge')).toHaveCount(0);
  });

  test('can create custom category', async ({ page }) => {
    const addCatBtn = page.locator('.btn-add-category-block h3:has-text("Add Category")');
    await expect(addCatBtn).toBeVisible();
    await addCatBtn.click();
    await expect(page.locator('.category-header h3:has-text("New Category")')).toBeVisible();
  });
});
