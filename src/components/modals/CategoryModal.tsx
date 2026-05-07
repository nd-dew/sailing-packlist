import React from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { LuggageIcon } from '../core/LuggageIcon';

export const CategoryModal: React.FC = () => {
  const { 
    selectedCategoryId, setSelectedCategoryId, categories, updateCategory, deleteCategory,
    setCategoryLuggage, packAndHideCategory, hideCategoryItemsAction, unpackCategoryItemsAction, luggages
  } = usePacklist();

  if (!selectedCategoryId) return null;

  const category = categories.find(c => c.id === selectedCategoryId);
  if (!category) return null;

  const closeCategoryModal = () => setSelectedCategoryId(null);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the entire category "${category.title}" and all its items?`)) {
      deleteCategory(category.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeCategoryModal}>
      <div className="item-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper" style={{ marginRight: '10px' }}>
            <input 
              className="modal-title-input" 
              autoFocus 
              value={category.title} 
              onChange={(e) => updateCategory(category.id, { title: e.target.value })} 
            />
            <span className="edit-icon">✎</span>
          </div>
          <button className="btn-close-modal" onClick={closeCategoryModal}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Category Priority</label>
            <div className="category-pills">
              {['must-have', 'should-have', 'nice-to-have'].map(pri => (
                <button 
                  key={pri} 
                  className={`cat-pill ${category.priority === pri ? 'active' : ''}`}
                  onClick={() => updateCategory(category.id, { priority: pri as any })}
                >
                  {pri.replace('-', ' ')}
                </button>
              ))}
              <button 
                className={`cat-pill ${!category.priority ? 'active' : ''}`}
                onClick={() => updateCategory(category.id, { priority: undefined })}
              >
                None
              </button>
            </div>
          </div>

          <div className="modal-field" style={{ marginTop: '20px' }}>
            <label>Assign all items to bag</label>
            <div className="luggage-toggle-group">
              {luggages.map(lug => (
                <button 
                  key={lug.id} 
                  className="luggage-toggle-btn"
                  onClick={() => {
                    setCategoryLuggage(category.id, lug.id);
                    closeCategoryModal();
                  }}
                >
                  <span style={{marginRight: '6px', display: 'flex'}}>
                    <LuggageIcon type={lug.icon || 'default'} color={lug.color || '#666'} size={14} />
                  </span>
                  {lug.name}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-field" style={{ marginTop: '20px' }}>
            <label>Bulk Actions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => { packAndHideCategory(category.id); closeCategoryModal(); }}
                style={{ padding: '10px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '6px', color: '#155724', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✓ Pack & Hide All Items
              </button>
              <button 
                onClick={() => { unpackCategoryItemsAction(category.id); closeCategoryModal(); }}
                style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '6px', color: '#856404', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ⨯ Unpack All Items
              </button>
              <button 
                onClick={() => { hideCategoryItemsAction(category.id); closeCategoryModal(); }}
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
              🗑️ Delete Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};