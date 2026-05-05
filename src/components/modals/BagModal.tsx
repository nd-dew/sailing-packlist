import React from 'react';
import { usePacklist } from '../../context/PacklistContext';

export const BagModal: React.FC = () => {
  const { 
    selectedLuggageId, setSelectedLuggageId, luggages, updateLuggage 
  } = usePacklist();

  if (!selectedLuggageId) return null;

  const lug = luggages.find(l => l.id === selectedLuggageId);
  if (!lug) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedLuggageId(null)}>
      <div className="item-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <input 
              className="modal-title-input" 
              value={lug.name} 
              onChange={(e) => updateLuggage(lug.id, { name: e.target.value })} 
            />
            <span className="edit-icon">✎</span>
          </div>
          <button className="btn-close-modal" onClick={() => setSelectedLuggageId(null)}>✕</button>
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
        </div>
      </div>
    </div>
  );
};
