import React, { useEffect, useRef, useState } from 'react';

interface Badge {
  key: string;
  label: string;
  x: number;
  y: number;
}

// Wait a moment before showing, so a quick Alt+arrow doesn't flash the badges
const SHOW_DELAY = 250;

const isTyping = (el: Element | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes((el as HTMLInputElement).type)));

const inViewport = (r: DOMRect) => r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;

/**
 * Holding Alt shows the keyboard shortcuts right where they apply: on the row under the cursor (or the
 * hovered one), its category, and the global controls. Elements opt in with data-shortcut.
 */
export const ShortcutOverlay: React.FC = () => {
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const hoveredRowRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let timer = 0;
    let shown = false;
    let frame = 0;

    const currentRow = () =>
      (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.checklist-grid [data-nav]')
      ?? (hoveredRowRef.current?.isConnected ? hoveredRowRef.current : null)
      ?? Array.from(document.querySelectorAll<HTMLElement>('.checklist-grid .list-item[data-nav]')).find(el => inViewport(el.getBoundingClientRect()))
      ?? null;

    const collect = () => {
      const row = currentRow();
      const block = row?.closest<HTMLElement>('.category-block') ?? null;
      const scopes: Element[] = [];
      if (row?.matches('.list-item')) scopes.push(row);
      if (block) {
        const header = block.querySelector('.category-header');
        if (header) scopes.push(header);
        const addLine = block.querySelector('.add-item-row');
        if (addLine) scopes.push(addLine);
      }

      const elements = new Set<HTMLElement>();
      scopes.forEach(scope => scope.querySelectorAll<HTMLElement>('[data-shortcut]').forEach(el => elements.add(el)));
      // everything outside the list rows / category cards is global (header, title, footer, quick add)
      document.querySelectorAll<HTMLElement>('[data-shortcut]').forEach(el => {
        if (!el.closest('.category-block') && !el.closest('.hover-tip')) elements.add(el);
      });

      const next: Badge[] = [];
      elements.forEach(el => {
        const r = el.getBoundingClientRect();
        if (!inViewport(r) || el.closest('.side-menu:not(.open)')) return;
        // corner badge; wide things (an item's name area) get it near their start, so it doesn't look like
        // it belongs to the next button; things at the very top get it underneath, inside the screen
        const x = r.width > 160 ? r.left + 28 : r.right - 4;
        const y = r.top < 14 ? r.bottom + 6 : r.top - 6;
        el.dataset.shortcut!.split(' ').forEach((label, i) => {
          next.push({ key: `${label}-${Math.round(r.left)}-${Math.round(r.top)}-${i}`, label, x: x + i * 2, y });
        });
      });
      setBadges(next);
    };

    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (shown) collect(); });
    };

    const hide = () => {
      clearTimeout(timer);
      shown = false;
      setBadges(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        if (e.repeat || shown || isTyping(document.activeElement)) return;
        e.preventDefault(); // keeps some browsers from jumping into their menu bar
        clearTimeout(timer);
        timer = window.setTimeout(() => { shown = true; collect(); }, SHOW_DELAY);
        return;
      }
      // Alt+arrow moves things around: follow them
      if (shown) refresh();
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Alt') hide(); };
    const onPointerOver = (e: PointerEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('.checklist-grid .list-item[data-nav]');
      if (row) {
        hoveredRowRef.current = row;
        if (shown) refresh();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('pointerover', onPointerOver);
    window.addEventListener('blur', hide);
    window.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    return () => {
      hide();
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerover', onPointerOver);
      window.removeEventListener('blur', hide);
      window.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, []);

  if (!badges) return null;
  return (
    <div className="shortcut-overlay" aria-hidden="true">
      {badges.map(b => (
        <kbd key={b.key} className="shortcut-badge" style={{ left: b.x, top: b.y }}>{b.label}</kbd>
      ))}
      <div className="shortcut-strip">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>Alt</kbd>+<kbd>↑</kbd><kbd>↓</kbd> reorder</span>
        <span><kbd>?</kbd> all shortcuts</span>
      </div>
    </div>
  );
};
