import { test, expect } from '@playwright/test';

test.describe('Mobile Item Swiping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('swiping right packs and hides the item', async ({ page }) => {
    // Wait for items to render
    const firstItemRow = page.locator('.list-item').first();
    await expect(firstItemRow).toBeVisible();

    const itemName = await firstItemRow.locator('.item-name').innerText();
    const packedCounter = page.locator('#stat-green');
    
    // Initial packed count should be 0 (default preset)
    await expect(packedCounter).toHaveText('0');

    // Simulate mobile swipe right
    const box = await firstItemRow.boundingBox();
    if (!box) throw new Error('Item not found');

    const startX = box.x + 20;
    const startY = box.y + box.height / 2;
    const endX = startX + 200;

    await firstItemRow.dispatchEvent('touchstart', { 
      touches: [{ identifier: 1, clientX: startX, clientY: startY }],
      targetTouches: [{ identifier: 1, clientX: startX, clientY: startY }] 
    });
    await firstItemRow.dispatchEvent('touchmove', { 
      touches: [{ identifier: 1, clientX: endX, clientY: startY }],
      targetTouches: [{ identifier: 1, clientX: endX, clientY: startY }] 
    });
    await firstItemRow.dispatchEvent('touchend', { 
      changedTouches: [{ identifier: 1, clientX: endX, clientY: startY }] 
    });

    // Verify item is hidden from main view (it should have grayed-out class if hidden section is expanded, but by default it's unmounted from main list)
    // Actually, by default, the hidden items are hidden behind the category's "X hidden" badge, so the specific .item-row we swiped should disappear from the main list.
    await expect(firstItemRow.locator('.item-name')).not.toHaveText(itemName);

    // Verify counter increased
    await expect(packedCounter).toHaveText('1');
  });

  test('swiping left cycles luggage', async ({ page }) => {
    // Wait for items to render
    const firstItemRow = page.locator('.list-item').first();
    await expect(firstItemRow).toBeVisible();

    // Ensure it has the default luggage first (backpack - lug_2)
    const badge = firstItemRow.locator('.luggage-badge');
    await expect(badge).toBeVisible();

    const initialTitle = await badge.getAttribute('title');

    // Simulate mobile swipe left
    const box = await firstItemRow.boundingBox();
    if (!box) throw new Error('Item not found');

    const startX = box.x + box.width - 20;
    const startY = box.y + box.height / 2;
    const endX = startX - 200;

    await firstItemRow.dispatchEvent('touchstart', { 
      touches: [{ identifier: 1, clientX: startX, clientY: startY }],
      targetTouches: [{ identifier: 1, clientX: startX, clientY: startY }] 
    });
    await firstItemRow.dispatchEvent('touchmove', { 
      touches: [{ identifier: 1, clientX: endX, clientY: startY }],
      targetTouches: [{ identifier: 1, clientX: endX, clientY: startY }] 
    });
    await firstItemRow.dispatchEvent('touchend', { 
      changedTouches: [{ identifier: 1, clientX: endX, clientY: startY }] 
    });

    // Verify the luggage badge title changed
    const newTitle = await badge.getAttribute('title');
    expect(newTitle).not.toBe(initialTitle);
  });
});
