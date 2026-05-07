import React from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { LuggageIcon } from '../core/LuggageIcon';

export const BagModal: React.FC = () => {
  const { 
    selectedLuggageId, setSelectedLuggageId, luggages, updateLuggage,
    deleteLuggage, packAndHideLuggageItems, unpackLuggageItems, hideLuggageItems
  } = usePacklist();

  if (!selectedLuggageId) return null;

  const lug = luggages.find(l => l.id === selectedLuggageId);
  if (!lug) return null;

  const closeBagModal = () => setSelectedLuggageId(null);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the bag "${lug.name}"? Items packed inside will be unassigned.`)) {
      deleteLuggage(lug.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeBagModal}>
      <div className="item-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper" style={{ marginRight: '10px' }}>
            <span style={{ marginRight: '8px' }}>
              <LuggageIcon type={lug.icon || 'default'} color={lug.color || '#fff'} size={20} />
            </span>
            <input 
              className="modal-title-input" 
              value={lug.name} 
              onChange={(e) => updateLuggage(lug.id, { name: e.target.value })} 
            />
            <span className="edit-icon">✎</span>
          </div>
          <button className="btn-close-modal" onClick={closeBagModal}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Bag Dimensions / Description</label>
            <textarea 
              className="modal-textarea auto-expand"
              value={lug.description || ''} 
              onChange={(e) => {
                updateLuggage(lug.id, { description: e.target.value });
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onFocus={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              placeholder="e.g. 55x40x20 Ryanair Cabin..." 
              rows={1}
            />
          </div>

          <div className="modal-field" style={{ marginTop: '20px' }}>
            <label>Bulk Actions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => { packAndHideLuggageItems(lug.id); closeBagModal(); }}
                style={{ padding: '10px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '6px', color: '#155724', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✓ Pack & Hide All Items
              </button>
              <button 
                onClick={() => { unpackLuggageItems(lug.id); closeBagModal(); }}
                style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '6px', color: '#856404', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ⨯ Unpack All Items
              </button>
              <button 
                onClick={() => { hideLuggageItems(lug.id); closeBagModal(); }}
                style={{ padding: '10px', background: '#e2e3e5', border: '1px solid #d6d8db', borderRadius: '6px', color: '#383d41', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🙈 Hide All Items
              </button>
            </div>
          </div>

          <div className="modal-field" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button 
              onClick={handleDelete}
              style={{ width: '100%', padding: '10px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '6px', color: '#cc0000', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🗑️ Delete Bag
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
