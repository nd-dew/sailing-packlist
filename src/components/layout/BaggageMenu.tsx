import React from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { LuggageIcon } from '../core/LuggageIcon';

export const BaggageMenu: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, luggages, categories, itemLuggage, checkedItems, 
    setSelectedItemId, setSelectedLuggageId, newLuggageName, setNewLuggageName, handleAddLuggage, changes,
    getMenuStyles
  } = usePacklist();

  const { rightMenuStyle, isMenuSwiping } = getMenuStyles();
  const baseSetQty = changes;

  return (
    <div className={`side-menu right-menu ${activeMenu === 'baggage' ? 'open' : ''} ${isMenuSwiping ? 'is-swiping' : ''}`} style={rightMenuStyle}>
      <div className="menu-header">
        <h2>Luggage</h2>
        <button className="btn-close-menu" onClick={() => setActiveMenu('main')}>✕</button>
      </div>
      <div className="menu-content">
        <p className="controls-desc" style={{color: '#b30000', marginBottom: '15px'}}><strong>⚠️ No Hard Suitcases:</strong> Soft bags only! Rigid luggage is impossible to store on a boat. Bring a soft duffel.</p>
        <div className="luggage-lists">
          {luggages.map((lug) => {
            const packedItems = categories.flatMap(c => c.items).filter(i => itemLuggage[i.id] === lug.id);
            return (
              <div key={lug.id} className="luggage-card">
                <div className="luggage-card-header" onClick={() => setSelectedLuggageId(lug.id)}>
                  <h4>
                    <span 
                      className="luggage-badge" 
                      style={{ borderColor: `${lug.color || '#999'}66`, color: lug.color || '#666', position: 'relative', top: '0', right: '0', display: 'inline-flex', marginRight: '8px' }}
                    >
                      <LuggageIcon type={lug.icon || 'default'} color={lug.color || '#666'} size={14} />
                    </span> 
                    {lug.name}
                  </h4>
                  <button className="btn-small-action">✎ Edit</button>
                </div>
                {lug.description && <p className="luggage-desc-preview">{lug.description}</p>}
                {packedItems.length === 0 ? <p className="empty-luggage">No items assigned yet.</p> : <ul className="luggage-contents">{packedItems.map(pi => {
                    const isBaseItem = (pi.id.startsWith('base_') && (pi.id.includes('underwear') || pi.id.includes('socks') || pi.id.includes('tshirt')));
                    const displayQty = isBaseItem ? baseSetQty : pi.qty;
                    return (
                      <li key={pi.id} className={`${checkedItems[pi.id] ? 'packed ' : ''}clickable`} onClick={() => setSelectedItemId(pi.id)}>
                        {displayQty ? <span className="pi-qty">{displayQty}x </span> : null}
                        {pi.name} {checkedItems[pi.id] && '✓'}
                      </li>
                    );
                  })}</ul>}
              </div>
            )
          })}
        </div>
        <div className="add-luggage-container">
          <input type="text" className="luggage-add-input" placeholder="+ Add another bag..." value={newLuggageName} onChange={(e) => setNewLuggageName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddLuggage(); }} />
          {newLuggageName.trim() && <button className="btn-luggage-add" onClick={handleAddLuggage}>Add Bag</button>}
        </div>
      </div>
    </div>
  );
};
