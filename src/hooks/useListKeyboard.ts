import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePacklist } from '../context/PacklistContext';
import type { ItemViewFilter, PackItem } from '../types';

// Shown in the shortcuts panel; keep in sync with the handler below
export const SHORTCUT_GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'Move around',
    keys: [
      ['↓ ↑  or  j k', 'Next / previous row'],
      ['← →  or  h l', 'Column to the left / right'],
      ['Home  End', 'First / last row'],
      ['Esc', 'Close the open item, leave a field'],
    ],
  },
  {
    title: 'Items',
    keys: [
      ['Space  or  x', 'Pack / unpack'],
      ['Enter', 'Open / close (note, sub-items)'],
      ['e  or  F2', 'Rename'],
      ['b  /  Shift+b', 'Next / previous bag'],
      ['Alt+↓  Alt+↑', 'Move down / up (also into the next category)'],
      ['Delete', 'Delete (press twice)'],
    ],
  },
  {
    title: 'Categories',
    keys: [
      ['Space  or  Enter', 'Fold / unfold (on a category header)'],
      ['c', 'Fold / unfold the category of the row'],
      ['Alt+↓  Alt+↑', 'Move the category (on its header)'],
      ['e', 'Edit the category (on its header)'],
    ],
  },
  {
    title: 'Everywhere',
    keys: [
      ['n', 'Add an item to this category'],
      ['a  or  /', 'Add an item without a category'],
      ['f', 'Filter: all → to pack → packed'],
      ['t', 'Packlists menu'],
      ['Ctrl+Z  Ctrl+Shift+Z', 'Undo / redo'],
      ['?', 'Show these shortcuts'],
    ],
  },
];

const FILTER_CYCLE: ItemViewFilter[] = ['all', 'unpacked', 'packed'];

const isTyping = (el: Element | null) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes((el as HTMLInputElement).type);
};

// Rows and category headers of the main list, in reading order, skipping folded categories' rows
const navTargets = () => Array.from(document.querySelectorAll<HTMLElement>('.checklist-grid [data-nav="item"], .checklist-grid [data-nav="sub-item"], .checklist-grid [data-nav="category"]'))
  .filter(el => el.dataset.nav === 'category' || !el.closest('.category-block.is-collapsed'));

const focusLater = (selector: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());

/**
 * Keyboard use of the list with a "cursor": the focused row or category header.
 * Single keys act on it while you're not typing in a field; Esc always steps back.
 */
export const useListKeyboard = (onToggleHelp: () => void) => {
  const ctx = usePacklist();
  // the handler is registered once; it always reads the latest state through this ref
  const ctxRef = useRef(ctx);
  useLayoutEffect(() => { ctxRef.current = ctx; });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const c = ctxRef.current;
      const active = document.activeElement as HTMLElement | null;
      if (isTyping(active) || e.ctrlKey || e.metaKey) return;
      if (c.activeMenu !== 'main' || document.querySelector('.modal-overlay, .share-confirm-overlay')) return;

      const current = active?.closest<HTMLElement>('[data-nav]') ?? null;
      const itemId = current?.dataset.itemId;
      const catId = current?.dataset.catId ?? current?.closest<HTMLElement>('.category-block')?.querySelector<HTMLElement>('[data-cat-id]')?.dataset.catId;
      const item: PackItem | undefined = itemId
        ? c.categories.flatMap(cat => cat.items.flatMap(i => [i, ...(i.subItems ?? [])])).find(i => i.id === itemId)
        : undefined;

      const go = (target: HTMLElement | undefined) => {
        if (!target) return;
        e.preventDefault();
        target.focus();
        target.scrollIntoView({ block: 'nearest' });
      };

      const targets = navTargets();
      const index = current ? targets.indexOf(current) : -1;
      const key = e.key;

      // Moving the cursor
      if ((key === 'ArrowDown' || key === 'j') && !e.altKey) return go(targets[index + 1] ?? targets[index < 0 ? 0 : index]);
      if ((key === 'ArrowUp' || key === 'k') && !e.altKey) return go(targets[index < 0 ? 0 : Math.max(0, index - 1)]);
      if (key === 'Home') return go(targets[0]);
      if (key === 'End') return go(targets[targets.length - 1]);
      if ((key === 'ArrowLeft' || key === 'h' || key === 'ArrowRight' || key === 'l') && current) {
        // nearest row (by height on screen) in the neighbouring column
        const columns = Array.from(document.querySelectorAll('.checklist-grid .checklist-column'));
        const col = columns.indexOf(current.closest('.checklist-column')!);
        const nextCol = columns[col + (key === 'ArrowLeft' || key === 'h' ? -1 : 1)];
        if (!nextCol) return;
        const y = current.getBoundingClientRect().top;
        const candidates = targets.filter(t => nextCol.contains(t));
        return go(candidates.sort((a, b) => Math.abs(a.getBoundingClientRect().top - y) - Math.abs(b.getBoundingClientRect().top - y))[0]);
      }

      if (key === 'Escape') {
        if (c.selectedItemId) {
          e.preventDefault();
          c.setSelectedItemId(null);
        } else {
          active?.blur();
        }
        return;
      }

      if (key === '?') { e.preventDefault(); onToggleHelp(); return; }
      if (key === 'a' || key === '/') { e.preventDefault(); document.querySelector<HTMLElement>('[data-quick-add]')?.focus(); return; }
      if (key === 'f') {
        e.preventDefault();
        c.setItemViewFilter(prev => FILTER_CYCLE[(FILTER_CYCLE.indexOf(prev) + 1) % FILTER_CYCLE.length]);
        return;
      }
      if (key === 't') { e.preventDefault(); document.querySelector<HTMLElement>('.trip-title')?.click(); return; }
      if (key === 'n') {
        e.preventDefault();
        const field = (catId && document.querySelector<HTMLElement>(`[data-add-item-for="${catId}"]`)) || document.querySelector<HTMLElement>('[data-quick-add]');
        if (catId) c.setCatCollapsed(catId, false);
        requestAnimationFrame(() => { field?.focus(); field?.scrollIntoView({ block: 'nearest' }); });
        return;
      }

      // On a category header
      if (current?.dataset.nav === 'category' && catId) {
        if (key === ' ' || key === 'Enter' || key === 'c') { e.preventDefault(); c.setCatCollapsed(catId, !c.collapsedCats[catId]); return; }
        if (key === 'e' || key === 'F2') { e.preventDefault(); c.setSelectedCategoryId(catId); return; }
        if (e.altKey && (key === 'ArrowDown' || key === 'ArrowUp')) {
          e.preventDefault();
          c.moveCategoryBy(catId, key === 'ArrowDown' ? 1 : -1);
          focusLater(`[data-cat-id="${catId}"]`);
        }
        return;
      }

      // On an item row
      if (!item || !itemId) return;
      const rowSelector = `.checklist-grid [data-item-id="${itemId}"]`;

      if (key === ' ' || key === 'x') {
        e.preventDefault();
        c.playPopSound('click');
        if (item.subItems?.length) {
          const counts = c.getSubItemCounts(item);
          c.toggleParentItem(item.id, counts.packed !== counts.total);
        } else {
          c.toggleCheck(item.id);
        }
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        c.setSelectedItemId(c.selectedItemId === itemId ? null : itemId);
        focusLater(rowSelector);
        return;
      }
      if (key === 'e' || key === 'F2') {
        e.preventDefault();
        c.setSelectedItemId(itemId);
        focusLater(`${rowSelector} .item-name-input`);
        return;
      }
      if (key === 'b' || key === 'B') {
        e.preventDefault();
        c.playPopSound('pop');
        c.cycleLuggage(itemId, e.shiftKey ? -1 : 1);
        return;
      }
      if (key === 'c' && catId) { e.preventDefault(); c.setCatCollapsed(catId, !c.collapsedCats[catId]); focusLater(`[data-cat-id="${catId}"]`); return; }
      if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault();
        // the same two-step confirmation as the ✕ button; the cursor moves on once it's gone
        const next = targets[index + 1] ?? targets[index - 1];
        const parentId = c.categories.flatMap(cat => cat.items).find(i => i.subItems?.some(s => s.id === itemId))?.id;
        c.triggerConfirm(`Press Delete again to delete ${item.name || 'item'}`, `delete_${itemId}`, () => {
          c.deleteItem(itemId, parentId);
          next?.focus();
        });
        return;
      }
      if (e.altKey && (key === 'ArrowDown' || key === 'ArrowUp') && current?.dataset.nav === 'item') {
        e.preventDefault();
        c.moveItemBy(itemId, key === 'ArrowDown' ? 1 : -1);
        focusLater(rowSelector);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onToggleHelp]);
};
