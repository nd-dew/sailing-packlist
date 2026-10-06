import React, { useLayoutEffect, useRef, useState } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import type { PackItem } from '../../types';

interface ItemDetailsProps {
  item: PackItem;
  // Sub-items shown on their own (packed/unpacked filter) only get a note, no nested list
  isSubItem?: boolean;
  onDone: () => void;
}

const autoSize = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

// Opened-in-place part of an item row: its note and its sub-items
export const ItemDetails: React.FC<ItemDetailsProps> = ({ item, isSubItem, onDone }) => {
  const { updateItem, checkedItems, toggleCheck, deleteItem, handleAddSubItem, playPopSound } = usePacklist();
  const [newSubName, setNewSubName] = useState('');
  // sub-item names when the item was opened: an emptied one comes back on close
  const [subNamesAtOpen] = useState(() => new Map((item.subItems ?? []).map(sub => [sub.id, sub.name])));
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => autoSize(noteRef.current), [item.description]);

  const addSubItem = () => {
    const name = newSubName.trim();
    if (!name) return;
    handleAddSubItem(item.id, name);
    setNewSubName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onDone();
  };

  return (
    <div className="item-details" onKeyDown={handleKeyDown}>
      <textarea
        ref={noteRef}
        className="item-note-input"
        rows={1}
        value={item.description || ''}
        onChange={(e) => updateItem(item.id, { description: e.target.value })}
        // size changes between the compact empty look and the editing look, so re-measure
        onFocus={(e) => autoSize(e.target)}
        onBlur={(e) => autoSize(e.target)}
        onKeyDown={(e) => {
          // ↑ at the very start goes back to the name
          const el = e.target as HTMLTextAreaElement;
          if (e.key === 'ArrowUp' && el.selectionStart === 0 && el.selectionEnd === 0) {
            e.preventDefault();
            el.closest('.list-item')?.querySelector<HTMLElement>('.item-name-input')?.focus();
          }
        }}
        placeholder="Add a note…"
        aria-label={`Note for ${item.name}`}
      />

      {!isSubItem && (
        <ul className="sub-items">
          {item.subItems?.map(sub => {
            const checked = !!checkedItems[sub.id];
            return (
              <li key={sub.id} className={`sub-item ${checked ? 'checked' : ''}`}>
                <div className="item-main">
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={sub.name}
                    onChange={(e) => { playPopSound('click'); toggleCheck(sub.id, e.nativeEvent); }}
                  />
                  <input
                    className="sub-item-name-input"
                    value={sub.name}
                    onChange={(e) => updateItem(sub.id, { name: e.target.value })}
                    placeholder={subNamesAtOpen.get(sub.id) || 'Sub-item name'}
                    aria-label="Sub-item name"
                  />
                </div>
                <button className="btn-remove" onClick={() => deleteItem(sub.id, item.id)} title="Remove sub-item" aria-label={`Remove ${sub.name}`}>✕</button>
              </li>
            );
          })}
          <li className="sub-item add-sub-item">
            <span className="add-sub-item-plus" aria-hidden="true">+</span>
            <input
              className="sub-item-name-input"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubItem(); } }}
              onBlur={addSubItem}
              placeholder="Add sub-item"
              aria-label="Add sub-item"
            />
          </li>
        </ul>
      )}
    </div>
  );
};
