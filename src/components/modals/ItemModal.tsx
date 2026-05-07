import React, { useState } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { ItemRow } from '../core/ItemRow';

export const ItemModal: React.FC = () => {
  const { 
    selectedItemId, setSelectedItemId, categories, updateItem, moveItemCategory, 
    luggages, itemLuggage, setItemLuggage, commitAction, setCategories, checkedItems, handleAddSubItem
  } = usePacklist();
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!selectedItemId) return null;

  let selectedItem = undefined;
  let parentItem = undefined;

  for (const cat of categories) {
    for (const item of cat.items) {
      if (item.id === selectedItemId) {
        selectedItem = item;
        break;
      }
      if (item.subItems) {
        const foundSub = item.subItems.find(s => s.id === selectedItemId);
        if (foundSub) {
          selectedItem = foundSub;
          parentItem = item;
          break;
        }
      }
    }
    if (selectedItem) break;
  }

  if (!selectedItem) return null;

  const closeItemModal = () => {
    if (selectedItem && !selectedItem.name.trim()) {
      if (parentItem) {
        commitAction('Removed empty custom sub-item');
        setCategories(prev => prev.map(c => ({
          ...c,
          items: c.items.map(i => i.id === parentItem.id ? { ...i, subItems: i.subItems?.filter(s => s.id !== selectedItemId) } : i)
        })));
      } else {
        commitAction('Removed empty custom item');
        setCategories(prev => prev.map(c => ({...c, items: c.items.filter(i => i.id !== selectedItemId)})));
      }
    }
    setSelectedItemId(null);
  };

  return (
    <div className="modal-overlay" onClick={closeItemModal}>
      <div className={`item-card-modal ${checkedItems[selectedItemId] ? 'modal-item-checked' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '10px' }}>
            {parentItem && (
               <div 
                 className="modal-parent-hint" 
                 style={{ fontSize: '0.65em', opacity: 0.7, marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                 onClick={() => setSelectedItemId(parentItem.id)}
                 title="Go back to parent"
               >
                 <span style={{ fontSize: '1.2em', lineHeight: '1' }}>↱</span> {parentItem.name}
               </div>
            )}
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
          </div>
          <button className="btn-close-modal" style={{ alignSelf: 'flex-start' }} onClick={closeItemModal}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-field" style={{ marginBottom: selectedItem.description ? '15px' : '5px' }}>
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
              placeholder="Describe..."
              rows={1}
              style={{
                minHeight: selectedItem.description ? '40px' : '26px',
                padding: selectedItem.description ? '8px 10px' : '4px 10px',
                transition: 'all 0.2s ease-in-out'
              }}
            />
          </div>

          {!parentItem && (
            <div className="modal-field">
              {selectedItem.subItems && selectedItem.subItems.length > 0 && (
                <ul className="sub-item-list" style={{ marginBottom: '10px' }}>
                  {selectedItem.subItems.map(subItem => (
                    <ItemRow 
                      key={subItem.id} 
                      item={subItem} 
                      assignedLuggage={luggages.find(l => l.id === itemLuggage[subItem.id])} 
                      isSubItem={true}
                    />
                  ))}
                </ul>
              )}
              <button 
                onClick={() => handleAddSubItem(selectedItem.id)}
                style={{ width: '100%', padding: '5px', fontSize: '0.85em', background: 'transparent', border: '1px dashed rgba(0, 31, 63, 0.3)', borderRadius: '6px', color: 'var(--navy)', cursor: 'pointer', opacity: 0.8 }}
              >
                + Add sub-item
              </button>
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
                    const currentCatId = categories.find(c => c.items.some(i => i.id === selectedItem.id || (i.subItems && i.subItems.some(s => s.id === selectedItem.id))))?.id;
                    return (
                      <button 
                        key={cat.id} 
                        className={`cat-pill ${currentCatId === cat.id ? 'active' : ''}`}
                        onClick={() => moveItemCategory(selectedItem.id, cat.id)}
                        disabled={!!parentItem}
                        title={parentItem ? "Sub-items inherit their category from the parent item." : ""}
                      >
                        {cat.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="modal-field">
                <label>Packed In</label>
                <div className="luggage-toggle-group">
                  <button 
                    className={`luggage-toggle-btn ${!itemLuggage[selectedItem.id] ? 'active' : ''}`} 
                    onClick={() => setItemLuggage(prev => { const next = {...prev}; delete next[selectedItem.id]; return next; })}
                  >
                    Unassigned
                  </button>
                  {luggages.map((lug) => (
                    <button 
                      key={lug.id} 
                      className={`luggage-toggle-btn ${itemLuggage[selectedItem.id] === lug.id ? 'active' : ''}`} 
                      onClick={() => setItemLuggage(prev => ({ ...prev, [selectedItem.id]: lug.id }))}
                      style={itemLuggage[selectedItem.id] === lug.id && lug.color ? { backgroundColor: lug.color, borderColor: lug.color } : {}}
                    >
                      {lug.icon && <span style={{marginRight: '4px'}}>{lug.icon}</span>} {lug.name}
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
