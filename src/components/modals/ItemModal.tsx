import React, { useState } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { ItemRow } from '../core/ItemRow';

export const ItemModal: React.FC = () => {
  const { 
    selectedItemId, setSelectedItemId, categories, updateItem, moveItemCategory, 
    luggages, itemLuggage, setItemLuggage, commitAction, setCategories, checkedItems
  } = usePacklist();
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!selectedItemId) return null;

  const selectedItem = categories.flatMap(c => c.items).find(i => i.id === selectedItemId);
  if (!selectedItem) return null;

  const closeItemModal = () => {
    if (selectedItem && !selectedItem.name.trim()) {
      commitAction('Removed empty custom item');
      setCategories(prev => prev.map(c => ({...c, items: c.items.filter(i => i.id !== selectedItemId)})));
    }
    setSelectedItemId(null);
  };

  return (
    <div className="modal-overlay" onClick={closeItemModal}>
      <div className={`item-card-modal ${checkedItems[selectedItemId] ? 'modal-item-checked' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <input 
              className="modal-title-input" 
              autoFocus 
              placeholder="Item Name..." 
              value={selectedItem.name} 
              onChange={(e) => updateItem(selectedItem.id, { name: e.target.value })} 
            />
            <span className="edit-icon">✎</span>
          </div>
          <button className="btn-close-modal" onClick={closeItemModal}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <textarea 
              className="modal-textarea auto-expand"
              value={selectedItem.description || ''} 
              onChange={(e) => {
                updateItem(selectedItem.id, { description: e.target.value });
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onFocus={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              placeholder="Add advice..."
              rows={1}
            />
          </div>

          {selectedItem.subItems && selectedItem.subItems.length > 0 && (
            <div className="modal-field">
              <ul className="sub-item-list">
                {selectedItem.subItems.map(subItem => (
                  <ItemRow 
                    key={subItem.id} 
                    item={subItem} 
                    assignedLugIdx={luggages.findIndex(l => l.id === itemLuggage[subItem.id])} 
                  />
                ))}
              </ul>
            </div>
          )}

          <div className="modal-advanced-toggle">
            <button onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced...'}
            </button>
          </div>

          {showAdvanced && (
            <div className="modal-advanced-content">
              <div className="modal-field">
                <label>Category</label>
                <div className="category-pills">
                  {categories.map(cat => {
                    const currentCatId = categories.find(c => c.items.some(i => i.id === selectedItem.id))?.id;
                    return (
                      <button 
                        key={cat.id} 
                        className={`cat-pill ${currentCatId === cat.id ? 'active' : ''}`}
                        onClick={() => moveItemCategory(selectedItem.id, cat.id)}
                      >
                        {cat.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="modal-field">
                <label>Assigned Baggage</label>
                <div className="luggage-toggle-group">
                  <button 
                    className={`luggage-toggle-btn ${!itemLuggage[selectedItem.id] ? 'active' : ''}`} 
                    onClick={() => setItemLuggage(prev => { const next = {...prev}; delete next[selectedItem.id]; return next; })}
                  >
                    Unassigned
                  </button>
                  {luggages.map((lug, idx) => (
                    <button 
                      key={lug.id} 
                      className={`luggage-toggle-btn ${itemLuggage[selectedItem.id] === lug.id ? 'active' : ''}`} 
                      onClick={() => setItemLuggage(prev => ({ ...prev, [selectedItem.id]: lug.id }))}
                    >
                      [{idx + 1}] {lug.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
