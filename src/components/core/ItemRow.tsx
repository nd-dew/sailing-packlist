import React, { useState, useRef, useEffect } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import type { PackItem, Luggage } from '../../types';
import { LuggageIcon } from './LuggageIcon';
import { ItemDetails } from './ItemDetails';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { justFinishedDrag } from '../../hooks/useListDrag';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

interface ItemRowProps {
  item: PackItem;
  displayQty?: number;
  assignedLuggage?: Luggage;
  isSubItem?: boolean;
  parentId?: string;
  parentName?: string;
  dragEnabled?: boolean;
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, displayQty, assignedLuggage, isSubItem, parentId, parentName, dragEnabled = false }) => {
  const { 
    checkedItems, toggleCheck, toggleParentItem, deleteItem, triggerConfirm, getNextLuggageHint, cycleLuggage, selectedItemId, setSelectedItemId, getSubItemCounts, playPopSound,
    swipeHintItemId, setSwipeHintItemId, markSwipeLearned, updateItem, luggages
  } = usePacklist();
  const hasBags = luggages.length > 0;

  const isExpanded = selectedItemId === item.id;
  const liRef = useRef<HTMLLIElement | null>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingState, setIsSwipingState] = useState(false);
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const isSwipingRef = useRef(false);

  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !dragEnabled || isExpanded });
  // Once a long-press turns into a drag, the touch must not also count as a swipe
  const dragTookOverRef = useRef(false);
  useEffect(() => {
    if (isDragging) dragTookOverRef.current = true;
  }, [isDragging]);
  const isSwipeActive = isSwipingState && !isDragging;

  const subItemCounts = item.subItems ? getSubItemCounts(item) : null;
  const isParentChecked = subItemCounts ? subItemCounts.packed === subItemCounts.total && subItemCounts.total > 0 : false;
  const isItemChecked = item.subItems ? isParentChecked : !!checkedItems[item.id];
  const isPartlyPacked = !!subItemCounts && subItemCounts.packed > 0 && subItemCounts.packed < subItemCounts.total;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = isPartlyPacked;
  }, [isPartlyPacked]);

  // An opened row closes when you tap or click anywhere outside it (menus and dialogs excluded)
  useEffect(() => {
    if (!isExpanded) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (liRef.current?.contains(target)) return;
      if (target.closest('.side-menu, .share-confirm-overlay, .modal-overlay, .confirm-toast-overlay')) return;
      // Opening another row replaces this one through its own click
      if (target.closest('.list-item .item-clickable-area, .list-item .sub-item-stats')) return;
      setSelectedItemId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isExpanded, setSelectedItemId]);

  // Bring the opened row (including its panel) into view, after a collapsed category had time to open
  useEffect(() => {
    if (!isExpanded) return;
    const t = setTimeout(() => liRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 320);
    return () => clearTimeout(t);
  }, [isExpanded]);

  const toggleExpanded = () => setSelectedItemId(isExpanded ? null : item.id);
  // Closing hands the keyboard cursor back to the row
  const close = () => {
    setSelectedItemId(null);
    requestAnimationFrame(() => liRef.current?.focus());
  };

  const prevLuggageId = usePrevious(assignedLuggage?.id);
  const prevChecked = usePrevious(isItemChecked);
  const [luggagePop, setLuggagePop] = useState(false);
  const [checkPop, setCheckPop] = useState(false);

  useEffect(() => {
    if (prevLuggageId !== undefined && assignedLuggage?.id !== prevLuggageId) {
      setLuggagePop(true);
      const t = setTimeout(() => setLuggagePop(false), 300);
      return () => clearTimeout(t);
    }
  }, [assignedLuggage?.id, prevLuggageId]);

  useEffect(() => {
    if (prevChecked !== undefined && !!isItemChecked !== !!prevChecked) {
      setCheckPop(true);
      const t = setTimeout(() => setCheckPop(false), 300);
      return () => clearTimeout(t);
    }
  }, [isItemChecked, prevChecked]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // An opened row holds text fields: no swiping (or dragging) it around
    if (isExpanded) return;
    listeners?.onTouchStart?.(e);
    dragTookOverRef.current = false;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    setIsSwipingState(true);
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || dragTookOverRef.current) return;
    const dx = e.targetTouches[0].clientX - touchStart.current.x;
    if (Math.abs(dx) > 10) {
      isSwipingRef.current = true;
      setSwipeOffset(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    if (dragTookOverRef.current) {
      dragTookOverRef.current = false;
      touchStart.current = null;
      setSwipeOffset(0);
      setIsSwipingState(false);
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    
    if (isSwipingRef.current && Math.abs(dx) > 120) {
      markSwipeLearned();
      if (dx > 0) {
        // Swipe Right: toggle packed
        playPopSound('click');
        if (item.subItems && item.subItems.length > 0) {
           toggleParentItem(item.id, !isParentChecked, e);
        } else {
           toggleCheck(item.id, e);
        }
      } else {
        // Swipe Left: Cycle Luggage
        playPopSound('pop');
        cycleLuggage(item.id, 1);
      }
    }

    setSwipeOffset(0);
    setIsSwipingState(false);
    setTimeout(() => { isSwipingRef.current = false; touchStart.current = null; }, 50);
  };

  const handleDelete = () => triggerConfirm(
    `Tap again to delete ${item.name || 'item'}`,
    `delete_${item.id}`,
    () => deleteItem(item.id, parentId)
  );

  const isSwipeDemo = swipeHintItemId === item.id;

  return (
    <li 
      ref={(el) => { setNodeRef(el); liRef.current = el; }}
      tabIndex={-1}
      data-nav={isSubItem ? 'sub-item' : 'item'}
      data-item-id={item.id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onMouseDown={(e) => listeners?.onMouseDown?.(e)}
      className={`list-item ${isDragging ? 'is-drag-source' : ''} ${isItemChecked ? 'checked' : ''} ${isSwipeActive ? 'is-swiping' : ''} ${isSubItem ? 'is-sub-item' : ''} ${checkPop ? 'pop-animate' : ''} ${isSwipeDemo ? 'swipe-demo' : ''} ${isExpanded ? 'is-expanded' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onAnimationEnd={(e) => { if (e.animationName === 'swipe-demo-row') setSwipeHintItemId(null); }}
    >
      {!isExpanded && (
        <div className={`swipe-background ${isSwipeActive && swipeOffset > 0 ? 'bg-pack' : isSwipeActive && swipeOffset < 0 ? 'bg-cycle' : ''}`}>
          <div className="swipe-hint left">{isItemChecked ? '↺ Unpack' : '✓ Pack'}</div>
          <div className="swipe-hint right">{getNextLuggageHint(item.id, 1)} ←</div>
        </div>
      )}
      <div 
        className="item-row"
        style={{ transform: isSwipeActive ? `translateX(${swipeOffset}px)` : 'translateX(0px)' }}
      >
        <div className="item-main">
          <input 
            ref={checkboxRef}
            type="checkbox" 
            title={isItemChecked ? 'Unpack' : 'Pack'}
            data-shortcut="Space"
            aria-label={item.name}
            checked={isItemChecked} 
            onChange={(e) => { 
              playPopSound('click'); 
              if (item.subItems && item.subItems.length > 0) {
                 toggleParentItem(item.id, !isParentChecked, e.nativeEvent);
              } else {
                 toggleCheck(item.id, e.nativeEvent); 
              }
            }} 
          />
          {isExpanded ? (
            <div className="item-clickable-area is-editing">
              {displayQty ? <span className="item-qty">{displayQty}x </span> : null}
              <input
                className="item-name-input"
                value={item.name}
                autoFocus={!item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); close(); } }}
                placeholder="Item name"
                aria-label="Item name"
              />
            </div>
          ) : (
            <div 
              className="item-clickable-area" 
              role="button"
              tabIndex={0}
              aria-expanded={false}
              onClick={() => { if (!isSwipingRef.current && !justFinishedDrag()) toggleExpanded(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(); } }}
            >
              {displayQty ? <span className="item-qty">{displayQty}x </span> : null}
              <span className="item-name">
                {isSubItem && parentName && <span className="subitem-parent-prefix">{parentName} / </span>}
                {item.name}
              </span>
              {item.description?.trim() && <span className="item-note-hint" title={item.description.trim()} aria-label={`Note: ${item.description.trim()}`}>≡</span>}
            </div>
          )}
        </div>
        {subItemCounts && (
          <button
            type="button"
            className="sub-item-stats"
            onClick={toggleExpanded}
            title={`${subItemCounts.packed} of ${subItemCounts.total} packed`}
            aria-expanded={isExpanded}
          >
            {subItemCounts.packed}/{subItemCounts.total}
          </button>
        )}
        {/* Always there (also without a bag), so an item taken out of its bag can be put back */}
        {hasBags && (
          <button
            type="button"
            className={`luggage-badge ${assignedLuggage ? '' : 'is-empty'} ${luggagePop ? 'pop-animate' : ''}`}
            style={{ '--lug-color': assignedLuggage?.color || '#8a94a3' } as React.CSSProperties}
            data-shortcut="b"
            title={`${assignedLuggage ? `Bag: ${assignedLuggage.name}` : 'No bag'} · click: ${getNextLuggageHint(item.id, 1).toLowerCase()}`}
            aria-label={`${assignedLuggage ? `Bag: ${assignedLuggage.name}` : 'No bag'}. Click: ${getNextLuggageHint(item.id, 1)}`}
            onClick={() => { playPopSound('pop'); cycleLuggage(item.id, 1); }}
          >
            <LuggageIcon type={assignedLuggage?.icon || 'default'} color={assignedLuggage?.color || '#8a94a3'} size={15} />
          </button>
        )}
        {isExpanded && (
          <button className="btn-close-item" onClick={close} title="Close" data-shortcut="Esc" aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
        )}
        <button className="btn-remove" onClick={handleDelete} title="Delete item" data-shortcut="Del" aria-label={`Delete ${item.name}`}>✕</button>
      </div>
      {isExpanded && <ItemDetails item={item} isSubItem={isSubItem} onDone={close} />}
    </li>
  );
};
