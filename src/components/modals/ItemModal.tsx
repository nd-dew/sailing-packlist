import React, { useState, useRef } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { ItemRow } from '../core/ItemRow';
import { LuggageIcon } from '../core/LuggageIcon';

export const ItemModal: React.FC = () => {
  const { 
    selectedItemId, setSelectedItemId, categories, updateItem, deleteItem, moveItemCategory, 
    luggages, itemLuggage, setItemLuggage, checkedItems, handleAddSubItem,
    toggleCheck, hideItem, cycleLuggage, getNextLuggageHint
  } = usePacklist();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingState, setIsSwipingState] = useState(false);
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const isSwipingRef = useRef(false);

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

  const currentLuggage = luggages.find(l => l.id === itemLuggage[selectedItem.id]);

  const closeItemModal = () => {
    if (selectedItem && !selectedItem.name.trim()) {
      deleteItem(selectedItemId, parentItem?.id);
    }
    setSelectedItemId(null);
  };

  const handleRealDelete = () => {
    if (confirm(`Delete ${selectedItem.name || 'this item'}?`)) {
      deleteItem(selectedItemId, parentItem?.id);
      setSelectedItemId(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.modal-textarea') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('.sub-item-list') || (e.target as HTMLElement).closest('.luggage-toggle-group') || (e.target as HTMLElement).closest('button')) return;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    setIsSwipingState(true);
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.targetTouches[0].clientX - touchStart.current.x;
    const dy = e.targetTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwipingRef.current = true;
      setSwipeOffset(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    
    if (isSwipingRef.current && Math.abs(dx) > 80) {
      if (dx > 0) {
        if (!checkedItems[selectedItem.id]) toggleCheck(selectedItem.id);
        hideItem(selectedItem.id);
        setSelectedItemId(null);
      } else {
        cycleLuggage(selectedItem.id, 1);
      }
    }

    setSwipeOffset(0);
    setIsSwipingState(false);
    setTimeout(() => { isSwipingRef.current = false; touchStart.current = null; }, 50);
  };

  return (
    <div className="modal-overlay" onClick={closeItemModal}>
      <div className={`swipe-background modal-swipe-bg ${isSwipingState && swipeOffset > 0 ? 'bg-pack' : ''}`}>
         <div className="swipe-hint left">→ Pack & Hide</div>
         <div className="swipe-hint right">{getNextLuggageHint(selectedItem.id, 1)} ←</div>
      </div>
      <div 
        className={`item-card-modal ${checkedItems[selectedItemId] ? 'modal-item-checked' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        style={{ transform: isSwipingState ? `translateX(${swipeOffset}px)` : 'none', transition: isSwipingState ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
          
          <div 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', cursor: 'pointer', opacity: currentLuggage ? 1 : 0.3, marginRight: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            onClick={() => cycleLuggage(selectedItem.id, 1)}
            title={currentLuggage ? `Packed in: ${currentLuggage.name}` : "Unassigned - Click to assign"}
          >
            <LuggageIcon type={currentLuggage?.icon || 'default'} color={currentLuggage?.color || '#666'} size={18} />
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
                      <span style={{marginRight: '6px', display: 'flex'}}>
                        <LuggageIcon type={lug.icon || 'default'} color={itemLuggage[selectedItem.id] === lug.id ? 'white' : (lug.color || '#666')} size={14} />
                      </span>
                      {lug.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="modal-field" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button 
                  onClick={handleRealDelete}
                  style={{ width: '100%', padding: '10px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '6px', color: '#cc0000', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Delete Item
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
