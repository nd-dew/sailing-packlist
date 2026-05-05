import React from 'react';
import { usePacklist } from '../../context/PacklistContext';

export const BagModal: React.FC = () => {
  const { 
    selectedLuggageId, setSelectedLuggageId, luggages, updateLuggage 
  } = usePacklist();

  if (!selectedLuggageId) return null;

  const lug = luggages.find(l => l.id === selectedLuggageId);
  if (!lug) return null;

  const handleLuggageImageUpload = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateLuggage(id, { imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

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
          {lug.imageUrl && <div className="modal-image-container"><img src={lug.imageUrl} alt={lug.name} /></div>}
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
          <div className="modal-field">
            <label>Bag Photo</label>
            <div className="image-upload-zone">
              <input 
                type="file" 
                accept="image/*" 
                id="lug-img-upload" 
                className="file-input-hidden" 
                onChange={(e) => handleLuggageImageUpload(lug.id, e.target.files?.[0] || null)} 
              />
              <label htmlFor="lug-img-upload" className="btn-upload-label">{lug.imageUrl ? 'Change Photo' : 'Upload Photo'}</label>
              {lug.imageUrl && (
                <button 
                  className="btn-remove-img" 
                  onClick={() => updateLuggage(lug.id, { imageUrl: undefined })}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
