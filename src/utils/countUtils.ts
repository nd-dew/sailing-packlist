import type { PackItem } from '../types';

/**
 * Counts packable leaf items: an item with sub-items counts as its sub-items,
 * never as itself. Items without a name (freshly created, still empty) are skipped.
 */
export const countLeafItems = (items: PackItem[], checkedItems: Record<string, boolean>) => {
  let total = 0;
  let packed = 0;
  const walk = (list: PackItem[]) => {
    list.forEach(item => {
      if (item.subItems && item.subItems.length > 0) {
        walk(item.subItems);
      } else if (item.name.trim()) {
        total++;
        if (checkedItems[item.id]) packed++;
      }
    });
  };
  walk(items);
  return { total, packed };
};
