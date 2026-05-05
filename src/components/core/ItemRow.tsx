import React, { useState, useRef } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import type { PackItem } from '../../types';

interface ItemRowProps {
  item: PackItem;
  displayQty?: number;
  assignedLugIdx: number;
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, displayQty, assignedLugIdx }) => {
  const { 
    checkedItems, toggleCheck, hideItem, getNextLuggageHint, cycleLuggage, setSelectedItemId
  } = usePacklist();

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingState, setIsSwipingState] = useState(false);
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const isSwipingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    setIsSwipingState(true);
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.targetTouches[0].clientX - touchStart.current.x;
    if (Math.abs(dx) > 10) {
      isSwipingRef.current = true;
      setSwipeOffset(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    
    if (isSwipingRef.current && Math.abs(dx) > 60) {
      if (dx > 0) {
        // Swipe Right: Pack & Hide
        if (!checkedItems[item.id]) {
            toggleCheck(item.id);
        }
        hideItem(item.id);
      } else {
        // Swipe Left: Cycle Luggage
        cycleLuggage(item.id, 1);
      }
    }

    setSwipeOffset(0);
    setIsSwipingState(false);
    setTimeout(() => { isSwipingRef.current = false; touchStart.current = null; }, 50);
  };

  return (
    <li 
      className={`list-item ${checkedItems[item.id] ? 'checked' : ''} ${isSwipingState ? 'is-swiping' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {assignedLugIdx !== -1 && <span className={`luggage-badge bag-color-${assignedLugIdx + 1}`}>{assignedLugIdx + 1}</span>}
      <div className={`swipe-background ${isSwipingState && swipeOffset > 0 ? 'bg-pack' : ''}`}>
         <div className="swipe-hint left">→ Pack & Hide</div>
         <div className="swipe-hint right">{getNextLuggageHint(item.id, 1)} ←</div>
      </div>
      <div 
        className="item-row"
        style={{ transform: isSwipingState ? `translateX(${swipeOffset}px)` : 'none' }}
      >
        <div className="item-main">
          <input type="checkbox" checked={!!checkedItems[item.id]} onChange={() => toggleCheck(item.id)} />
          <div 
            className="item-clickable-area" 
            onClick={() => { if(!isSwipingRef.current) setSelectedItemId(item.id); }}
          >
            {displayQty ? <span className="item-qty">{displayQty}x </span> : null}
            <span className="item-name">{item.name}</span>
          </div>
        </div>
        <button className="btn-hide" onClick={() => hideItem(item.id)}>✕</button>
      </div>
    </li>
  );
};
