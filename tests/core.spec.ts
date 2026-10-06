import { test, expect } from '@playwright/test';

test.describe('Core App Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure default state from preset
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');
  });

  test('initial render and stats display correctly', async ({ page }) => {
    // Header should be visible
    await expect(page.locator('.app-header')).toBeVisible();
    
    // There should be items in the list
    const items = page.locator('.list-item');
    await expect(items).toHaveCount(await items.count()); // Just ensuring it finds them
    expect(await items.count()).toBeGreaterThan(10);

    // Initial stats should be 0 packed
    const packedCounter = page.locator('#stat-green');
    await expect(packedCounter).toHaveText('0');
  });

  test('checking an item updates stats and UI', async ({ page }) => {
    const firstItem = page.locator('.list-item').first();
    const checkbox = firstItem.locator('input[type="checkbox"]');
    const packedCounter = page.locator('#stat-green');

    // Ensure it's unchecked initially
    await expect(checkbox).not.toBeChecked();

    // Check it
    await checkbox.check();

    // Verify UI updates
    await expect(checkbox).toBeChecked();
    await expect(firstItem).toHaveClass(/checked/);
    await expect(packedCounter).toHaveText('1');

    // Uncheck it
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await expect(packedCounter).toHaveText('0');
  });

  test('deleting an item needs a second tap and can be undone', async ({ page }) => {
    const firstItem = page.locator('.list-item').first();
    const itemName = await firstItem.locator('.item-name').innerText();
    const itemByName = page.locator('.list-item .item-name', { hasText: itemName });
    const removeBtn = firstItem.locator('.btn-remove');

    // First tap only asks for confirmation
    await removeBtn.click();
    await expect(page.locator('.confirm-toast')).toContainText('Tap again to delete');
    await expect(itemByName).toBeVisible();

    // Second tap deletes it
    await removeBtn.click();
    await expect(itemByName).toHaveCount(0);

    // Undo brings it back
    await page.locator('.header-undo-btn[aria-label="Undo"]').click();
    await expect(itemByName).toBeVisible();
  });

  test('categories can be collapsed and expanded', async ({ page }) => {
    const firstCat = page.locator('.category-block').first();
    const collapseBtn = firstCat.locator('.btn-collapse-cat');

    await expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    await collapseBtn.click();
    await expect(firstCat).toHaveClass(/is-collapsed/);
    await expect(collapseBtn).toHaveAttribute('aria-expanded', 'false');

    await collapseBtn.click();
    await expect(firstCat).not.toHaveClass(/is-collapsed/);
  });

  test('tapping an item opens it in place to edit its note, tapping outside closes it', async ({ page }) => {
    const firstItem = page.locator('.list-item').first();
    const itemName = await firstItem.locator('.item-name').innerText();

    await firstItem.locator('.item-clickable-area').click();
    await expect(firstItem).toHaveClass(/is-expanded/);
    await expect(firstItem.locator('.item-name-input')).toHaveValue(itemName);
    // Opening must not pop the keyboard: nothing is focused yet
    await expect(firstItem.locator('.item-name-input')).not.toBeFocused();

    const note = firstItem.locator('.item-note-input');
    await note.fill('Pack the blue one');

    // Tap outside the item closes it, and the note hint shows on the closed row
    await page.locator('.app-header').click({ position: { x: 5, y: 5 } });
    await expect(firstItem).not.toHaveClass(/is-expanded/);
    await expect(firstItem.locator('.item-note-hint')).toBeVisible();

    // Reopen: the note is still there
    await firstItem.locator('.item-clickable-area').click();
    await expect(firstItem.locator('.item-note-input')).toHaveValue('Pack the blue one');
    await firstItem.locator('.item-name-input').press('Escape');
    await expect(firstItem).not.toHaveClass(/is-expanded/);
  });

  test('sub-items can be added, packed and show a partly packed parent', async ({ page }) => {
    const firstItem = page.locator('.list-item').first();
    await firstItem.locator('.item-clickable-area').click();

    const addInput = firstItem.locator('.add-sub-item input');
    await addInput.fill('Charger');
    await addInput.press('Enter');
    await addInput.fill('Cable');
    await addInput.press('Enter');
    // Focus stays in the add field for quick entry
    await expect(addInput).toBeFocused();

    const subs = firstItem.locator('.sub-item:not(.add-sub-item)');
    await expect(subs).toHaveCount(2);
    await subs.nth(0).locator('input[type="checkbox"]').check();

    await expect(firstItem.locator('.sub-item-stats')).toHaveText('1/2');
    const parentCheckbox = firstItem.locator('.item-row input[type="checkbox"]');
    expect(await parentCheckbox.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);

    // The counter now counts sub-items, not the parent
    await subs.nth(1).locator('input[type="checkbox"]').check();
    await expect(parentCheckbox).toBeChecked();
    await expect(page.locator('#stat-green')).toHaveText('2');
  });

  test('items are added from the line at the bottom of a category, one after another', async ({ page }) => {
    const firstCat = page.locator('.category-block').first();
    const rowsBefore = await firstCat.locator('.list-item').count();
    const add = firstCat.locator('.add-item-input');

    await add.fill('Spare sunglasses');
    await add.press('Enter');
    await add.fill('Lip balm');
    await add.press('Enter');
    // the cursor stays in the field for the next one
    await expect(add).toBeFocused();

    await expect(firstCat.locator('.list-item')).toHaveCount(rowsBefore + 2);
    await expect(firstCat.locator('.list-item .item-name').last()).toHaveText('Lip balm');
  });

  test('an item can be added without a category', async ({ page }) => {
    const quick = page.locator('[data-quick-add]');
    await quick.fill('Passport photo');
    await quick.press('Enter');

    const other = page.locator('.category-block', { has: page.locator('h3', { hasText: 'Other' }) });
    await expect(other.locator('.list-item .item-name')).toHaveText(['Passport photo']);
    // "Other" is created at the end, next to the field at the bottom
    await expect(page.locator('.category-block:not(.btn-add-category-block) .category-header h3').last()).toContainText('Other');
  });

  test('an item taken out of its bag can be put in a bag again', async ({ page }) => {
    const chip = page.locator('.list-item').first().locator('.luggage-badge');
    // cycle until it says "No bag"
    for (let i = 0; i < 5 && !/^No bag/.test((await chip.getAttribute('title')) ?? ''); i++) await chip.click();
    await expect(chip).toHaveClass(/is-empty/);
    await expect(chip).toBeVisible();

    await chip.click();
    await expect(chip).not.toHaveClass(/is-empty/);
    await expect(chip).toHaveAttribute('title', /^Bag: /);
  });

  test('an opened item has a close button', async ({ page }) => {
    const firstItem = page.locator('.list-item').first();
    await firstItem.locator('.item-clickable-area').click();
    await expect(firstItem).toHaveClass(/is-expanded/);
    await firstItem.locator('.btn-close-item').click();
    await expect(firstItem).not.toHaveClass(/is-expanded/);
  });

  test('undo and redo buttons revert and re-apply actions', async ({ page }) => {
    const undoBtn = page.locator('button[aria-label="Undo"]');
    const redoBtn = page.locator('button[aria-label="Redo"]');
    const checkbox = page.locator('.list-item input[type="checkbox"]').first();

    // Initially undo/redo should be disabled
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeDisabled();

    // Action 1: Check an item
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(undoBtn).toBeEnabled();

    // Undo Action 1
    await undoBtn.click();
    await expect(checkbox).not.toBeChecked();
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();

    // Redo Action 1
    await redoBtn.click();
    await expect(checkbox).toBeChecked();
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();
  });

  test('dragging an item reorders it and can be undone', async ({ page }) => {
    const firstCat = page.locator('.category-block').first();
    const names = firstCat.locator('.list-item .item-name');
    const first = await names.nth(0).innerText();
    const second = await names.nth(1).innerText();

    // Drag the second row above the first one
    const from = await firstCat.locator('.list-item').nth(1).boundingBox();
    const to = await firstCat.locator('.list-item').nth(0).boundingBox();
    if (!from || !to) throw new Error('Rows not found');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 10, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 5, { steps: 10 });
    await page.mouse.up();

    await expect(names.nth(0)).toHaveText(second);
    await expect(names.nth(1)).toHaveText(first);

    // Dropping must not open the item
    await expect(page.locator('.list-item.is-expanded')).toHaveCount(0);

    await page.locator('.header-undo-btn[aria-label="Undo"]').click();
    await expect(names.nth(0)).toHaveText(first);
  });

  test('compact density can be switched on in settings', async ({ page }) => {
    await page.locator('button', { hasText: '☰' }).first().click();
    await page.locator('.segmented button', { hasText: 'Compact' }).click();
    await expect(page.locator('.app-container')).toHaveClass(/density-compact/);
  });

  test('dragging a category header moves the whole category, and can be undone', async ({ page }) => {
    const titles = page.locator('.category-header h3');
    // textContent, not innerText: headers are uppercased by CSS
    const first = (await titles.nth(0).textContent())!;
    const second = (await titles.nth(1).textContent())!;

    // Fold the (long) first category so both headers fit on the phone screen
    await page.locator('.category-block').nth(0).locator('.btn-collapse-cat').click();
    await expect(page.locator('.category-block').nth(0)).toHaveClass(/is-collapsed/);
    await page.waitForTimeout(400); // let the fold animation finish before measuring header positions

    // Grab the second header (away from its buttons) and drop it on the top half of the first one
    const from = await page.locator('.category-header').nth(1).boundingBox();
    const to = await page.locator('.category-header').nth(0).boundingBox();
    if (!from || !to) throw new Error('Headers not found');
    await page.mouse.move(from.x + from.width * 0.6, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width * 0.6, from.y + from.height / 2 - 10, { steps: 4 });
    // all categories fold to their headers while dragging
    await expect(page.locator('.checklist-grid')).toHaveClass(/is-reordering-categories/);
    const target = await page.locator('.category-header').nth(0).boundingBox();
    await page.mouse.move(target!.x + target!.width * 0.6, target!.y + 4, { steps: 12 });
    // a gap marks where it will land
    await expect(page.locator('.category-block.is-drag-source')).toHaveCount(1);
    await page.mouse.up();

    await expect(titles.nth(0)).toHaveText(second);
    await expect(titles.nth(1)).toHaveText(first);
    // Dropping didn't open the category editor or fold the category
    await expect(page.locator('.item-card-modal')).toBeHidden();
    await expect(page.locator('.category-block').nth(0)).not.toHaveClass(/is-collapsed/);

    await page.locator('.header-undo-btn[aria-label="Undo"]').click();
    await expect(titles.nth(0)).toHaveText(first);
  });
});

