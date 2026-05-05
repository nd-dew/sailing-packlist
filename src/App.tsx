import { useState, useEffect } from 'react';
import './App.css';

interface PackItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  optional?: boolean;
  qty?: number;
}

interface Category {
  id: string;
  title: string;
  priority?: 'must-have' | 'nice-to-have';
  items: PackItem[];
}

interface Warning {
  id: string;
  text: string;
}

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'docs',
    title: 'Get Formal',
    priority: 'must-have',
    items: [
      { id: 'docs_passport', name: 'ID Card / Passport', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Passports-assorted.jpg/500px-Passports-assorted.jpg' },
      { id: 'docs_logbook', name: 'Printed Sailing Logbook' },
      { id: 'docs_license', name: 'Sailing License', description: 'Required for the Skipper. Not needed for crew.' },
      { id: 'docs_vhf', name: 'VHF License', description: 'Official radio operator certificate.' },
      { id: 'docs_cash', name: 'Cash (Local Currency)', description: 'Many smaller island restaurants and local ports only accept cash.' },
    ],
  },
  {
    id: 'base',
    title: 'Get Dressed: Base Layers',
    priority: 'must-have',
    items: [
      { id: 'base_underwear', name: 'Underwear', qty: 0 },
      { id: 'base_socks', name: 'Socks', qty: 0 },
      { id: 'base_tshirt', name: 'T-Shirts / Tops', qty: 0 },
      { id: 'base_thermal_top', name: 'Thermal Base Layer (Top)', description: 'Highly recommended for night watches.' },
      { id: 'base_thermal_bot', name: 'Thermal Base Layer (Bottom)', description: 'Highly recommended for cold night watches.' },
    ],
  },
  {
    id: 'tough',
    title: 'Get Dressed: Tough Weather',
    priority: 'must-have',
    items: [
      { id: 'out_shoes_tough', name: 'Tough Weather / Rain Boots', description: 'For standing in the rain during a night watch. Keep your feet dry to stay warm!', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Antron_Fleece.jpg/500px-Antron_Fleece.jpg' },
      { id: 'out_mid_fleece', name: 'Warm Mid-layer: Fleece / Puffer', description: 'The layer that traps heat. Essential when the sun goes down. A light puffer is great for extra warmth without the bulk.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Antron_Fleece.jpg/500px-Antron_Fleece.jpg' },
      { id: 'out_mid_pants', name: 'Warm Mid-layer: Sweatpants', description: 'Comfy, warm pants for lounging or under waterproofs.' },
      { id: 'out_wind_jacket', name: 'Windproof / Waterproof Top', description: 'Your outer shield against rain and salt spray.' },
      { id: 'out_wind_pants', name: 'Windproof / Waterproof Bottoms', description: 'Keeps your legs dry when sitting on wet decks.' },
      { id: 'out_sleeping_bag', name: 'Sleeping Bag', description: 'Check with the captain! Most charters provide linens, but a sleeping bag is good for colder nights.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Israel_2_021_Sleeping_Rucksack-Tourist.jpg/500px-Israel_2_021_Sleeping_Rucksack-Tourist.jpg' },
    ],
  },
  {
    id: 'outerwear',
    title: 'Get Dressed: General',
    priority: 'nice-to-have',
    items: [
      { id: 'out_shoes_deck', name: 'Sneakers', description: 'One pair of sneakers for everything: exploring on land and moving on the boat. Ensure soles are non-marking.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Girl_wearing_Sperrys.jpg/500px-Girl_wearing_Sperrys.jpg' },
      { id: 'out_shorts', name: 'Shorts' },
      { id: 'out_swim', name: 'Swimwear', description: 'Check the water temperature here: https://www.seatemperature.org/ to see if you need a shorty or just standard trunks.' },
      { id: 'out_hat_warm', name: 'Warm Beanie Hat', description: 'Crucial for keeping body heat in during night watches.' },
      { id: 'out_hat_sun', name: 'Sun Hat (Baseball Cap)', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Young_Woman_in_Sun_Hat.jpg/500px-Young_Woman_in_Sun_Hat.jpg' },
      { id: 'out_gloves', name: 'Gloves', description: 'Protects your hands from line burns when handling ropes.' },
      { id: 'out_nice_clothes', name: 'One "Nice" / Party Outfit', description: 'Check with the captain! Are we dining at fancy marinas or fighting storms? Bring something unwrinkled or themed if planned.' },
      { id: 'out_sunglasses', name: 'Sunglasses', description: 'Essential. Reflection from the water doubles the sun exposure to your eyes.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Sunglasses_pic17.jpg/500px-Sunglasses_pic17.jpg' },
    ],
  },
  {
    id: 'toiletries',
    title: 'Get Pretty',
    priority: 'nice-to-have',
    items: [
      { id: 'toi_brush', name: 'Toothbrush & Paste' },
      { id: 'toi_towel', name: 'Quick-dry Sports Towel', description: 'Saves space and dries much faster in the yacht cabin.' },
      { id: 'toi_gel', name: 'Universal Shower Gel / Shampoo' },
      { id: 'toi_clipper', name: 'Nail Clippers' },
      { id: 'toi_shave', name: 'Shaving Cream & Razor', description: 'If you plan to stay smooth.' },
      { id: 'toi_earplugs', name: 'Earplugs', description: 'Useful to have something when you sleep close to the engine, or when people start to party and you want to sleep.' },
      { id: 'toi_sunscreen', name: 'Sunscreen (High SPF)', description: 'The sun is stronger on the water due to reflection.' },
    ],
  },
  {
    id: 'tech',
    title: 'Tech Kit',
    priority: 'nice-to-have',
    items: [
      { id: 'tech_phone', name: 'Phone + Charger' },
      { id: 'tech_powerbank', name: 'Powerbank' },
      { id: 'tech_watch', name: 'Watch + Charger' },
      { id: 'tech_headlamp', name: 'Headlamp (Must have RED light)', description: 'Red light preserves night vision for everyone on deck.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Black_Diamond_Spot_on_Half_Dome_Helmet.JPG/500px-Black_Diamond_Spot_on_Half_Dome_Helmet.JPG' },
      { id: 'tech_camera', name: 'Camera / GoPro', description: 'Capture the memories!' },
      { id: 'tech_speaker', name: 'Bluetooth Speaker', description: 'Check if one is not already on the ship, many yachts include them.' },
      { id: 'tech_multitool', name: 'Multitool / Knife', description: 'Check-in luggage only!', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Lezyne_Carbon_10_collage.jpg/500px-Lezyne_Carbon_10_collage.jpg' },
      { id: 'tech_laptop', name: 'Laptop', description: 'If you really are such a workaholic, otherwise you can skip it.' },
    ],
  },
  {
    id: 'meds',
    title: 'Med Kit',
    priority: 'nice-to-have',
    items: [
      { id: 'med_pain', name: 'Painkillers (Ibuprofen / Paracetamol)' },
      { id: 'med_charcoal', name: 'Activated Charcoal / Stomach Meds', description: 'Essential for diarrhea and stomach issues.' },
      { id: 'med_personal', name: 'Personal Prescription Meds', description: 'Bring enough for the whole trip.' },
    ],
  },
  {
    id: 'fun',
    title: 'Just Chill',
    priority: 'nice-to-have',
    items: [
      { id: 'fun_book', name: 'Book / Kindle' },
      { id: 'fun_games', name: 'Card / Board Games', description: 'Align with the rest of the crew so everyone doesn\'t bring the same thing.' },
      { id: 'fun_thermos', name: 'Thermal Cup / Thermos', description: 'Great for keeping coffee or tea hot during cold night watches.' },
    ],
  },
];

const INITIAL_WARNINGS: Warning[] = [
  { id: 'warn_1', text: 'No Hard Suitcases: Soft bags only! Rigid luggage is impossible to store on a boat. Bring a soft duffel.' },
  { id: 'warn_2', text: 'Sleeping Bag: Check with the captain first! Many charters provide bed linen.' },
];

function App() {
  const [changes, setChanges] = useState<number>(3);
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('sailingPacklist_structure_v4');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  const [warnings, setWarnings] = useState<Warning[]>(() => {
    const saved = localStorage.getItem('sailingPacklist_warnings_v4');
    return saved ? JSON.parse(saved) : INITIAL_WARNINGS;
  });
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sailingPacklist_checked_v4');
    return saved ? JSON.parse(saved) : {};
  });
  const [hiddenItems, setHiddenItems] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sailingPacklist_hidden_v4');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingWarningId, setEditingWarningId] = useState<string | null>(null);
  const [showHiddenCats, setShowHiddenCats] = useState<Record<string, boolean>>({});
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
  const [showSettingsInfo, setShowSettingsInfo] = useState(false);

  useEffect(() => { localStorage.setItem('sailingPacklist_structure_v4', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('sailingPacklist_warnings_v4', JSON.stringify(warnings)); }, [warnings]);
  useEffect(() => { localStorage.setItem('sailingPacklist_checked_v4', JSON.stringify(checkedItems)); }, [checkedItems]);
  useEffect(() => { localStorage.setItem('sailingPacklist_hidden_v4', JSON.stringify(hiddenItems)); }, [hiddenItems]);

  const toggleCheck = (id: string) => setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  const hideItem = (id: string) => setHiddenItems(prev => ({ ...prev, [id]: true }));
  const unhideItem = (id: string) => setHiddenItems(prev => { const next = {...prev}; delete next[id]; return next; });
  const toggleCatHidden = (catId: string) => setShowHiddenCats(prev => ({ ...prev, [catId]: !prev[catId] }));

  const applyPreset = (role: 'crew' | 'captain') => {
    const captainItems = ['docs_logbook', 'docs_license', 'docs_vhf', 'docs_maps', 'docs_insurance', 'tech_laptop'];
    setHiddenItems(prev => {
      const next = { ...prev };
      if (role === 'crew') {
        captainItems.forEach(id => next[id] = true);
      } else {
        captainItems.forEach(id => delete next[id]);
      }
      return next;
    });
  };

  const resetAll = () => {
    if (confirm("Reset everything to default? All custom items, images, and edits will be lost.")) {
      setCategories(INITIAL_CATEGORIES);
      setWarnings(INITIAL_WARNINGS);
      setHiddenItems({});
      setCheckedItems({});
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleAddItem = (categoryId: string) => {
    const name = newItemNames[categoryId]?.trim();
    if (!name) return;
    setCategories(prev => prev.map(cat => (cat.id === categoryId ? { ...cat, items: [...cat.items, { id: `custom_${Date.now()}`, name, description: 'Added by you.' }] } : cat)));
    setNewItemNames(prev => ({ ...prev, [categoryId]: '' }));
  };

  const updateItem = (id: string, updates: Partial<PackItem>) => {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      items: cat.items.map(item => item.id === id ? { ...item, ...updates } : item)
    })));
  };

  const handleAddWarning = () => setWarnings(prev => [...prev, { id: `warn_${Date.now()}`, text: 'New warning...' }]);
  const updateWarning = (id: string, newText: string) => {
    if (!newText.trim()) return;
    setWarnings(prev => prev.map(w => w.id === id ? { ...w, text: newText } : w));
    setEditingWarningId(null);
  };
  const removeWarning = (id: string) => setWarnings(prev => prev.filter(w => w.id !== id));

  const baseSetQty = changes;
  
  const selectedItem = categories.flatMap(c => c.items).find(i => i.id === selectedItemId);

  const renderCategory = (cat: Category) => {
    const activeItems = cat.items.filter(item => !hiddenItems[item.id]);
    const hiddenCatItems = cat.items.filter(item => hiddenItems[item.id]);
    const isShowingHidden = showHiddenCats[cat.id];

    return (
      <div key={cat.id} className="category-block">
        <div className="category-header">
          <div className="category-title-area">
            <h3>{cat.title}</h3>
            {cat.priority && (
              <span className={`priority-badge priority-${cat.priority}`}>
                {cat.priority === 'must-have' ? '★ Must Have' : 'Nice to Have'}
              </span>
            )}
          </div>
          {hiddenCatItems.length > 0 && (
            <button className={`badge-hidden ${isShowingHidden ? 'active' : ''}`} onClick={() => toggleCatHidden(cat.id)}>
              {isShowingHidden ? 'Hide' : `${hiddenCatItems.length} hidden`}
            </button>
          )}
        </div>
        <ul>
          {activeItems.map(item => {
            const isBaseItem = (item.id.startsWith('base_') && (item.id.includes('underwear') || item.id.includes('socks') || item.id.includes('tshirt')));
            const displayQty = isBaseItem ? baseSetQty : item.qty;

            return (
              <li key={item.id} className={`list-item ${checkedItems[item.id] ? 'checked' : ''}`}>
                <div className="item-row">
                  <div className="item-main">
                    <input type="checkbox" checked={!!checkedItems[item.id]} onChange={() => toggleCheck(item.id)} />
                    <div className="item-clickable-area" onClick={() => setSelectedItemId(item.id)}>
                      <span className="item-qty">{displayQty ? `${displayQty}x ` : ''}</span>
                      <span className="item-name">{item.name}</span>
                    </div>
                  </div>
                  <button className="btn-hide" onClick={() => hideItem(item.id)} title="Hide item">✕</button>
                </div>
              </li>
            );
          })}

          {isShowingHidden && hiddenCatItems.map(item => (
            <li key={item.id} className="list-item grayed-out">
              <div className="item-row">
                <div className="item-main">
                  <span className="item-name" style={{ textDecoration: 'line-through', cursor: 'default' }}>{item.name}</span>
                </div>
                <div className="hidden-actions">
                  <button className="btn-unhide" onClick={() => unhideItem(item.id)}>↺</button>
                  <button className="btn-delete" onClick={() => {
                    if (confirm(`Permanently delete ${item.name}?`)) {
                      setCategories(prev => prev.map(c => ({...c, items: c.items.filter(i => i.id !== item.id)})));
                      unhideItem(item.id);
                    }
                  }}>🗑️</button>
                </div>
              </div>
            </li>
          ))}

          <li className="list-item add-item-row">
            <input type="text" className="inline-add-input" placeholder="+ Add item..." value={newItemNames[cat.id] || ''} onChange={(e) => setNewItemNames({ ...newItemNames, [cat.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(cat.id); }} />
            {newItemNames[cat.id]?.trim() && <button className="btn-inline-add" onClick={() => handleAddItem(cat.id)}>Add</button>}
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header"><h1>Crew Packing List</h1></header>
      
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItemId(null)}>
          <div className="item-card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <input 
                className="modal-title-input" 
                value={selectedItem.name} 
                onChange={(e) => updateItem(selectedItem.id, { name: e.target.value })}
              />
              <button className="btn-close-modal" onClick={() => setSelectedItemId(null)}>✕</button>
            </div>
            <div className="modal-body">
              {selectedItem.imageUrl && (
                <div className="modal-image-container">
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} />
                </div>
              )}
              <div className="modal-field">
                <label>Description / Advice</label>
                <textarea 
                  className="modal-textarea"
                  value={selectedItem.description || ''} 
                  onChange={(e) => updateItem(selectedItem.id, { description: e.target.value })}
                  placeholder="Add your own advice or description..."
                />
              </div>
              <div className="modal-field">
                <label>Image URL</label>
                <input 
                  type="text" 
                  className="modal-text-input"
                  value={selectedItem.imageUrl || ''} 
                  onChange={(e) => updateItem(selectedItem.id, { imageUrl: e.target.value })}
                  placeholder="https://... (Paste image link here)"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="compact-settings">
        <div className="settings-row">
          <div className="control-group">
            <label>Expected Showers:</label>
            <div className="stepper-control">
              <button className="stepper-btn" onClick={() => setChanges(Math.max(1, changes - 1))} disabled={changes <= 1}>−</button>
              <div className="stepper-value">{changes}</div>
              <button className="stepper-btn" onClick={() => setChanges(Math.min(14, changes + 1))} disabled={changes >= 14}>+</button>
            </div>
            <span className="calc-note">Estimation: <strong>{baseSetQty} Base Sets</strong></span>
            <button className={`btn-info-toggle ${showSettingsInfo ? 'active' : ''}`} onClick={() => setShowSettingsInfo(!showSettingsInfo)}>ⓘ</button>
          </div>
          <div className="presets-group">
             <label>Preset:</label>
             <button className="btn-preset" onClick={() => applyPreset('crew')}>Crew</button>
             <button className="btn-preset" onClick={() => applyPreset('captain')}>Captain</button>
          </div>
        </div>
        {showSettingsInfo && (
          <p className="controls-desc">
            This is just a suggestion. Instead of packing for every night, we believe the number of <strong>expected showers</strong> is a better way to estimate how many times you'll actually want to change your base layers. Just look at the route and count when you'll have a chance to freshen up!
          </p>
        )}
      </div>

      <div className="checklist-grid">
        <div className="checklist-column">
          {categories.filter(cat => cat.id === 'base' || cat.id === 'tough' || cat.id === 'outerwear').map(renderCategory)}
        </div>
        <div className="checklist-column">
          {categories.filter(cat => cat.id !== 'base' && cat.id !== 'tough' && cat.id !== 'outerwear').map(renderCategory)}
        </div>
      </div>

      <div className="do-not-pack-section">
        <div className="warnings-header">
          <h3>🚫 Important Warnings</h3>
          <button className="btn-add-warning" onClick={handleAddWarning}>+ Add Warning</button>
        </div>
        <ul className="warnings-list">
          {warnings.map(w => (
            <li key={w.id} className="warning-item">
              <div className="warning-content">
                {editingWarningId === w.id ? (
                  <textarea autoFocus className="edit-warning-input" defaultValue={w.text} onBlur={(e) => updateWarning(w.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); updateWarning(w.id, e.currentTarget.value); } }} />
                ) : (
                  <span onClick={() => setEditingWarningId(w.id)}>{w.text}</span>
                )}
              </div>
              <button className="btn-remove-warning" onClick={() => removeWarning(w.id)}>✕</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="global-actions">
        <button onClick={resetAll} className="btn-reset">Factory Reset List</button>
      </div>

      <footer className="app-footer"><a href="https://sailingcommunity.be" target="_blank" rel="noopener noreferrer"><img src="/favicon.png" alt="BSC Logo" className="footer-logo" />Belgian Sailing Community</a></footer>
    </div>
  );
}

export default App;
