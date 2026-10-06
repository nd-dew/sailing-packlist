import React from 'react';
import type { PackItem, Luggage } from '../../types';
import { LuggageIcon } from './LuggageIcon';

interface ItemDragPreviewProps {
  item: PackItem;
  checked: boolean;
  qty?: number;
  luggage?: Luggage;
}

// Static look-alike of an ItemRow, shown under the pointer while an item is being dragged
export const ItemDragPreview: React.FC<ItemDragPreviewProps> = ({ item, checked, qty, luggage }) => (
  <div className={`list-item drag-overlay ${checked ? 'checked' : ''}`}>
    <div className="item-row">
      <div className="item-main">
        <input type="checkbox" checked={checked} readOnly tabIndex={-1} aria-hidden="true" />
        <div className="item-clickable-area">
          {qty ? <span className="item-qty">{qty}x </span> : null}
          <span className="item-name">{item.name}</span>
        </div>
      </div>
      {luggage && (
        <span className="luggage-badge" style={{ '--lug-color': luggage.color || '#666' } as React.CSSProperties}>
          <LuggageIcon type={luggage.icon || 'default'} color={luggage.color || '#666'} size={15} />
        </span>
      )}
    </div>
  </div>
);
