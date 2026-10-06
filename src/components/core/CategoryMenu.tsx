import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePacklist } from '../../context/PacklistContext';
import type { Category } from '../../types';
import { LuggageIcon } from './LuggageIcon';
import { PRIORITIES } from '../../utils/priorities';

// Rendered at the page level, under the right end of its anchor (category cards clip and get transformed
// while sorting, so it can't live inside them). Closes on a click outside, Escape or scrolling, and gives
// focus back to where it was opened from.
const usePopover = (anchor: DOMRect, onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(anchor.right);
  // the listeners below are set up once; they always call the latest onClose
  const closeRef = useRef(onClose);
  // where focus goes back to; taken on first render, before the menu grabs focus
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useLayoutEffect(() => { closeRef.current = onClose; });
  useLayoutEffect(() => {
    const width = ref.current?.offsetWidth ?? 0;
    setLeft(Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8)));
  }, [anchor]);
  useEffect(() => {
    // focus the first option, so the keyboard can go straight on
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('.confirm-toast-overlay')) closeRef.current();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // arrows move between the buttons of the menu
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key) && ref.current) {
        const buttons = Array.from(ref.current.querySelectorAll<HTMLElement>('button'));
        const i = buttons.indexOf(document.activeElement as HTMLElement);
        const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        e.preventDefault();
        e.stopPropagation();
        buttons[(i + step + buttons.length) % buttons.length]?.focus();
        return;
      }
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      closeRef.current();
      opener?.focus();
    };
    const onScroll = () => closeRef.current();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScroll);
    };
  }, [opener]);
  return { ref, style: { top: anchor.bottom + 6, left } as React.CSSProperties };
};

const PriorityOptions: React.FC<{ cat: Category; onPick: () => void }> = ({ cat, onPick }) => {
  const { updateCategory } = usePacklist();
  const pick = (priority: Category['priority']) => {
    updateCategory(cat.id, { priority });
    onPick();
  };
  return (
    <div className="priority-options" role="group" aria-label="Priority">
      {PRIORITIES.map(p => (
        <button
          key={p.value}
          className={`priority-option ${cat.priority === p.value ? 'active' : ''}`}
          onClick={() => pick(p.value)}
          aria-pressed={cat.priority === p.value}
        >
          <span className="priority-stars">{p.stars}</span>{p.label}
        </button>
      ))}
      <button className={`priority-option ${!cat.priority ? 'active' : ''}`} onClick={() => pick(undefined)} aria-pressed={!cat.priority}>
        <span className="priority-stars">☆☆☆</span>No priority
      </button>
    </div>
  );
};

// Clicking the stars: just the priority
export const PriorityPicker: React.FC<{ cat: Category; anchor: DOMRect; onClose: () => void }> = ({ cat, anchor, onClose }) => {
  const { ref, style } = usePopover(anchor, onClose);
  return createPortal(
    <div ref={ref} style={style} className="category-popover priority-popover" role="dialog" aria-label={`Priority of ${cat.title}`}>
      <PriorityOptions cat={cat} onPick={onClose} />
    </div>,
    document.body
  );
};

// Right-click / long-press / "m" on a category header: everything you can do with the whole category
export const CategoryMenu: React.FC<{ cat: Category; anchor: DOMRect; onClose: () => void; onRename: () => void }> = ({ cat, anchor, onClose, onRename }) => {
  const { luggages, packCategory, unpackCategoryItemsAction, setCategoryLuggage, deleteCategory, showPriorities } = usePacklist();
  const { ref, style } = usePopover(anchor, onClose);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const act = (action: () => void) => {
    action();
    onClose();
  };

  return createPortal(
    <div ref={ref} style={style} className="category-popover category-menu" role="menu" aria-label={`${cat.title} actions`}>
      <div className="category-menu-row">
        <button role="menuitem" className="category-menu-btn" onClick={() => act(onRename)}>Rename</button>
        <button role="menuitem" className="category-menu-btn" onClick={() => act(() => packCategory(cat.id))}>Pack all</button>
        <button role="menuitem" className="category-menu-btn" onClick={() => act(() => unpackCategoryItemsAction(cat.id))}>Unpack all</button>
      </div>

      {luggages.length > 0 && (
        <>
          <div className="category-menu-label">Put everything in</div>
          <div className="category-menu-row wrap">
            {luggages.map(lug => (
              <button key={lug.id} role="menuitem" className="category-menu-btn bag" onClick={() => act(() => setCategoryLuggage(cat.id, lug.id))}>
                <LuggageIcon type={lug.icon || 'default'} color={lug.color || '#666'} size={14} />{lug.name}
              </button>
            ))}
          </div>
        </>
      )}

      {showPriorities && (
        <>
          <div className="category-menu-label">Priority</div>
          <PriorityOptions cat={cat} onPick={onClose} />
        </>
      )}

      <div className="category-menu-divider" />
      <button
        role="menuitem"
        className={`category-menu-btn danger ${confirmDelete ? 'armed' : ''}`}
        onClick={() => (confirmDelete ? act(() => deleteCategory(cat.id)) : setConfirmDelete(true))}
      >
        {confirmDelete ? `Tap again to delete ${cat.title} and its ${cat.items.length} items` : 'Delete category'}
      </button>
    </div>,
    document.body
  );
};
