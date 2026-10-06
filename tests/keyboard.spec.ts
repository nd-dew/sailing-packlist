import { test, expect, type Page } from '@playwright/test';

// Keyboard use is a desktop thing: run as a desktop browser
test.use({ isMobile: false, hasTouch: false, viewport: { width: 1280, height: 900 } });

const focusedRow = (page: Page) => page.locator('.checklist-grid [data-nav]:focus');

test.describe('Keyboard mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');
    await page.locator('.list-item').first().waitFor();
  });

  test('arrow keys move a cursor over category headers and rows', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await expect(focusedRow(page)).toHaveAttribute('data-nav', 'category');
    await page.keyboard.press('j');
    const first = page.locator('.list-item').first();
    await expect(first).toBeFocused();
    await page.keyboard.press('j');
    await expect(page.locator('.list-item').nth(1)).toBeFocused();
    await page.keyboard.press('k');
    await expect(first).toBeFocused();
  });

  test('single keys act on the row under the cursor', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const row = page.locator('.list-item').first();
    const name = await row.locator('.item-name').textContent();

    // Space packs
    await page.keyboard.press(' ');
    await expect(row).toHaveClass(/checked/);
    await expect(page.locator('#stat-green')).toHaveText('1');

    // Enter opens, Esc closes and the cursor stays on the row
    await page.keyboard.press('Enter');
    await expect(row).toHaveClass(/is-expanded/);
    await page.keyboard.press('Escape');
    await expect(row).not.toHaveClass(/is-expanded/);
    await expect(row).toBeFocused();

    // b moves it to the next bag
    const bagBefore = await row.locator('.luggage-badge').getAttribute('title');
    await page.keyboard.press('b');
    await expect(row.locator('.luggage-badge')).not.toHaveAttribute('title', bagBefore!);

    // Alt+Down moves it one down, and the cursor goes along
    await page.keyboard.press('Alt+ArrowDown');
    await expect(page.locator('.list-item .item-name').nth(1)).toHaveText(name!);
    await expect(page.locator('.list-item').nth(1)).toBeFocused();
  });

  test('e renames, Enter finishes; n adds to the category; Delete needs two presses', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('e');
    const nameInput = page.locator('.list-item.is-expanded .item-name-input');
    await expect(nameInput).toBeFocused();
    await nameInput.fill('Renamed by keyboard');
    await nameInput.press('Enter');
    await expect(page.locator('.list-item').first().locator('.item-name')).toHaveText('Renamed by keyboard');

    await page.keyboard.press('n');
    const add = page.locator('.category-block').first().locator('.add-item-input');
    await expect(add).toBeFocused();
    await add.press('Escape');

    const count = await page.locator('.list-item').count();
    await page.locator('.list-item').first().focus();
    await page.keyboard.press('Delete');
    await expect(page.locator('.confirm-toast')).toContainText('Press Delete again');
    await expect(page.locator('.list-item')).toHaveCount(count);
    await page.keyboard.press('Delete');
    await expect(page.locator('.list-item')).toHaveCount(count - 1);
  });

  test('? shows the shortcuts, Esc closes them', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('.shortcuts-card')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.shortcuts-card')).toBeHidden();
  });

  test('typing in a field never triggers shortcuts', async ({ page }) => {
    const quick = page.locator('[data-quick-add]');
    await quick.focus();
    await page.keyboard.type('box of tea');
    await expect(quick).toHaveValue('box of tea');
    await expect(page.locator('#stat-green')).toHaveText('0');
    await expect(page.locator('.shortcuts-card')).toHaveCount(0);
  });

  test('holding Alt shows the shortcuts where they apply', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.down('Alt');
    const badges = page.locator('.shortcut-badge');
    await expect(page.locator('.shortcut-strip')).toBeVisible();
    // the row under the cursor gets its own keys, not every row
    const labels = await badges.allTextContents();
    for (const key of ['Space', 'Enter', 'b', 'Del', 'e', 'c', 't', 'Ctrl+Z']) expect(labels).toContain(key);
    expect(labels.filter(l => l === 'Space')).toHaveLength(1);
    await page.keyboard.up('Alt');
    await expect(badges).toHaveCount(0);
    await expect(page.locator('.shortcut-strip')).toHaveCount(0);
  });

  test('d edits the note, Shift+D the packlist notes, m opens the category menu', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('d');
    const note = page.locator('.list-item.is-expanded .item-note-input');
    await expect(note).toBeFocused();
    await note.fill('typed with the keyboard');
    await note.press('Escape');
    await expect(page.locator('.list-item').first().locator('.item-note-hint')).toBeVisible();

    await page.locator('.list-item').first().focus();
    await page.keyboard.press('Shift+D');
    await expect(page.locator('.trip-notes-input')).toBeFocused();
    await page.keyboard.press('Escape');

    await page.locator('.list-item').first().focus();
    await page.keyboard.press('m');
    const menu = page.locator('.category-menu');
    await expect(menu).toBeVisible();
    // arrows move inside the menu, Esc closes it and gives the cursor back
    await page.keyboard.press('ArrowRight');
    await expect(menu.getByRole('menuitem', { name: 'Pack all', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(page.locator('.list-item').first()).toBeFocused();
  });
});

