import { useState, useEffect, useRef, useCallback } from 'react';
import { parse } from 'yaml';
import medBlueward26Raw from './presets/med_blueward_26.yaml?raw';
import './App.css';

interface PackItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  qty?: number;
  captainOnly?: boolean;
  defaultBag?: string;
}

interface Category {
  id: string;
  title: string;
  priority?: 'must-have' | 'should-have' | 'nice-to-have';
  items: PackItem[];
}

interface Warning {
  id: string;
  text: string;
}

interface Luggage {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

interface AppSnapshot {
  changes: number;
  categories: Category[];
  warnings: Warning[];
  checkedItems: Record<string, boolean>;
  hiddenItems: Record<string, boolean>;
  luggages: Luggage[];
  itemLuggage: Record<string, string>;
}

interface HistoryEntry {
  id: string;
  message: string;
  timestamp: number;
  snapshot: AppSnapshot;
}

const PRESETS: Record<string, any> = {
  'med_blueward_26': parse(medBlueward26Raw)
};

const getPresetData = (cruiseId: string) => PRESETS[cruiseId] || PRESETS['med_blueward_26'];

const getInitialLuggageAssignments = (cruiseId: string) => {
  const data = getPresetData(cruiseId);
  const assignments: Record<string, string> = {};
  data.categories.forEach((cat: Category) => {
    cat.items.forEach(item => {
      if (item.defaultBag) {
        assignments[item.id] = item.defaultBag;
      } else {
        assignments[item.id] = 'lug_1'; // fallback
      }
    });
  });
  return assignments;
};

const getPresetCategories = (cruiseId: string, role: 'crew' | 'captain') => {
  const data = getPresetData(cruiseId);
  return data.categories.map((cat: Category) => ({
    ...cat,
    items: role === 'crew' ? cat.items.filter((i: PackItem) => !i.captainOnly) : [...cat.items]
  }));
};

function App() {
  const [changes, setChanges] = useState<number>(() => {
    const saved = localStorage.getItem('sailingPacklist_showers_v16');
    return saved ? parseInt(saved) : (getPresetData('med_blueward_26').showers || 3);
  });
  
  // Header Visibility State
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    localStorage.setItem('sailingPacklist_showers_v16', changes.toString());
  }, [changes]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDir = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 0) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowHeader(false); // scrolling down
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true); // scrolling up
      }
      
      lastScrollY = currentScrollY > 0 ? currentScrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('sailingPacklist_structure_v16');
    return saved ? JSON.parse(saved) : getPresetCategories('med_blueward_26', 'crew');
  });
  const [warnings, setWarnings] = useState<Warning[]>(() => {
    const saved = localStorage.getItem('sailingPacklist_warnings_v16');
    return saved ? JSON.parse(saved) : getPresetData('med_blueward_26').warnings || [];
  });
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sailingPacklist_checked_v16');
    return saved ? JSON.parse(saved) : {};
  });
  const [hiddenItems, setHiddenItems] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sailingPacklist_hidden_v16');
    return saved ? JSON.parse(saved) : {};
  });
  const [luggages, setLuggages] = useState<Luggage[]>(() => {
    const saved = localStorage.getItem('sailingPacklist_luggages_v16');
    return saved ? JSON.parse(saved) : getPresetData('med_blueward_26').luggages || [];
  });
  const [itemLuggage, setItemLuggage] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('sailingPacklist_itemLuggage_v16');
    return saved ? JSON.parse(saved) : getInitialLuggageAssignments('med_blueward_26');
  });

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedLuggageId, setSelectedLuggageId] = useState<string | null>(null);
  const [newLuggageName, setNewLuggageName] = useState('');
  const [showHiddenCats, setShowHiddenCats] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'must-have' | 'should-have' | 'nice-to-have'>('all');

  const [swipingItemId, setSwipingItemId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const isSwiping = useRef(false);

  const [activeToastId, setActiveToastId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'main' | 'settings' | 'baggage'>('main');

  // Double-click confirmation toast state
  const [confirmToast, setConfirmToast] = useState<{message: string, actionId: string} | null>(null);
  const confirmTimeout = useRef<any>(null);

  const triggerConfirm = (message: string, actionId: string, onConfirm: () => void) => {
    if (confirmToast?.actionId === actionId) {
      onConfirm();
      setConfirmToast(null);
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    } else {
      setConfirmToast({ message, actionId });
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
      confirmTimeout.current = setTimeout(() => setConfirmToast(null), 3000);
    }
  };

  // Reset double-click states when closing menus or modals
  useEffect(() => {
    setConfirmToast(null);
  }, [activeMenu, selectedItemId]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // History State
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  const commitAction = (message: string) => {
    const snapshot: AppSnapshot = { changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage };
    setPast(prev => [...prev.slice(-29), { id: Date.now().toString(), message, timestamp: Date.now(), snapshot }]);
    setFuture([]);
  };

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const currentSnapshot: AppSnapshot = { changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage };
    
    setPast(prev => [...prev, { id: Date.now().toString(), message: next.message, timestamp: Date.now(), snapshot: currentSnapshot }]);
    
    setChanges(next.snapshot.changes);
    setCategories(next.snapshot.categories);
    setWarnings(next.snapshot.warnings);
    setCheckedItems(next.snapshot.checkedItems);
    setHiddenItems(next.snapshot.hiddenItems);
    setLuggages(next.snapshot.luggages);
    setItemLuggage(next.snapshot.itemLuggage);
    
    setFuture(prev => prev.slice(1));
  }, [future, changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const last = past[past.length - 1];
    const currentSnapshot: AppSnapshot = { changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage };
    
    setFuture(prev => [{ id: Date.now().toString(), message: last.message, timestamp: Date.now(), snapshot: currentSnapshot }, ...prev]);
    
    setChanges(last.snapshot.changes);
    setCategories(last.snapshot.categories);
    setWarnings(last.snapshot.warnings);
    setCheckedItems(last.snapshot.checkedItems);
    setHiddenItems(last.snapshot.hiddenItems);
    setLuggages(last.snapshot.luggages);
    setItemLuggage(last.snapshot.itemLuggage);
    
    setPast(prev => prev.slice(0, -1));
  }, [past, changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const showPriorityToast = (catId: string) => {
    setActiveToastId(catId);
    setTimeout(() => {
      setActiveToastId(prev => prev === catId ? null : prev);
    }, 2000);
  };

  useEffect(() => { localStorage.setItem('sailingPacklist_structure_v16', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('sailingPacklist_warnings_v16', JSON.stringify(warnings)); }, [warnings]);
  useEffect(() => { localStorage.setItem('sailingPacklist_checked_v16', JSON.stringify(checkedItems)); }, [checkedItems]);
  useEffect(() => { localStorage.setItem('sailingPacklist_hidden_v16', JSON.stringify(hiddenItems)); }, [hiddenItems]);
  useEffect(() => { localStorage.setItem('sailingPacklist_luggages_v16', JSON.stringify(luggages)); }, [luggages]);
  useEffect(() => { localStorage.setItem('sailingPacklist_itemLuggage_v16', JSON.stringify(itemLuggage)); }, [itemLuggage]);

  const updateChanges = (newVal: number) => {
    commitAction(`Changed showers to ${newVal}`);
    setChanges(newVal);
  };

  const toggleCheck = (id: string) => {
    const item = categories.flatMap(c => c.items).find(i => i.id === id);
    commitAction(checkedItems[id] ? `Unchecked ${item?.name || 'item'}` : `Checked ${item?.name || 'item'}`);
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const hideItem = (id: string) => {
    const item = categories.flatMap(c => c.items).find(i => i.id === id);
    commitAction(`Hid ${item?.name || 'item'}`);
    setHiddenItems(prev => ({ ...prev, [id]: true }));
  };
  
  const unhideItem = (id: string) => {
    const item = categories.flatMap(c => c.items).find(i => i.id === id);
    commitAction(`Restored ${item?.name || 'item'}`);
    setHiddenItems(prev => { const next = {...prev}; delete next[id]; return next; });
  };
  
  const toggleCatHidden = (catId: string) => setShowHiddenCats(prev => ({ ...prev, [catId]: !prev[catId] }));

  const unhideAllInCategory = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    commitAction(`Restored all items in ${cat.title}`);
    setHiddenItems(prev => {
      const next = { ...prev };
      cat.items.forEach(item => delete next[item.id]);
      return next;
    });
    setShowHiddenCats(prev => ({ ...prev, [catId]: false }));
  };

  const cycleLuggage = (itemId: string, direction: 1 | -1) => {
    const item = categories.flatMap(c => c.items).find(i => i.id === itemId);
    commitAction(`Changed bag for ${item?.name || 'item'}`);
    setItemLuggage(prev => {
      const currentLugId = prev[itemId];
      const currentIndex = luggages.findIndex(l => l.id === currentLugId);
      const total = luggages.length + 1;
      let virtIndex = currentIndex === -1 ? 0 : currentIndex + 1;
      let nextVirt = (virtIndex + direction) % total;
      if (nextVirt < 0) nextVirt += total;
      const nextState = { ...prev };
      if (nextVirt === 0) delete nextState[itemId];
      else nextState[itemId] = luggages[nextVirt - 1].id;
      return nextState;
    });
  };

  const getLuggageNameByIndex = (virtIndex: number) => {
    if (virtIndex === 0) return 'Unassign luggage';
    return `Put in ${luggages[virtIndex - 1]?.name}` || 'Unassign luggage';
  };

  const getNextLuggageHint = (itemId: string, direction: 1 | -1) => {
    const currentLugId = itemLuggage[itemId];
    const currentIndex = luggages.findIndex(l => l.id === currentLugId);
    const total = luggages.length + 1;
    let virtIndex = currentIndex === -1 ? 0 : currentIndex + 1;
    let nextVirt = (virtIndex + direction) % total;
    if (nextVirt < 0) nextVirt += total;
    return getLuggageNameByIndex(nextVirt);
  };

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    setSwipingItemId(id);
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.targetTouches[0].clientX - touchStart.current.x;
    if (Math.abs(dx) > 10) {
      isSwiping.current = true;
      setSwipeOffset(dx);
    }
  };

  const handleTouchEnd = (itemId: string, e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    
    if (isSwiping.current && Math.abs(dx) > 60) {
      if (dx > 0) {
        // Swipe Right: Pack & Hide
        setCheckedItems(prev => ({ ...prev, [itemId]: true }));
        hideItem(itemId);
      } else {
        // Swipe Left: Cycle Luggage
        cycleLuggage(itemId, 1);
      }
    }

    setSwipeOffset(0);
    setSwipingItemId(null);
    setTimeout(() => { isSwiping.current = false; touchStart.current = null; }, 50);
  };

  const [presetCruise, setPresetCruise] = useState('med_blueward_26');

  const applyPreset = (cruise: string, role: 'crew' | 'captain') => {
    if (confirm(`WARNING: This will completely factory reset your list to the ${role.toUpperCase()} preset for this cruise. ALL custom items, bag assignments, and packing progress will be permanently lost! Are you sure?`)) {
      setCategories(getPresetCategories(cruise, role));
      setWarnings(getPresetData(cruise).warnings || []);
      setHiddenItems({});
      setCheckedItems({});
      setItemLuggage(getInitialLuggageAssignments(cruise));
      setLuggages(getPresetData(cruise).luggages || []);
      setActiveMenu('main');
    }
  };

  const resetAll = () => {
    if (confirm("Reset everything to default?")) {
      setCategories(getPresetCategories(presetCruise, 'crew'));
      setWarnings(getPresetData(presetCruise).warnings || []);
      setHiddenItems({});
      setCheckedItems({});
      setItemLuggage(getInitialLuggageAssignments(presetCruise));
      setLuggages(getPresetData(presetCruise).luggages || []);
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleCreateItem = (categoryId: string) => {
    commitAction('Created new custom item');
    const newId = `custom_${Date.now()}`;
    setCategories(prev => prev.map(cat => (cat.id === categoryId ? { ...cat, items: [...cat.items, { id: newId, name: '' }] } : cat)));
    setSelectedItemId(newId);
  };

  const closeItemModal = () => {
    if (selectedItemId) {
      const currentItem = categories.flatMap(c => c.items).find(i => i.id === selectedItemId);
      if (currentItem && !currentItem.name.trim()) {
        commitAction('Removed empty custom item');
        setCategories(prev => prev.map(c => ({...c, items: c.items.filter(i => i.id !== selectedItemId)})));
      }
    }
    setSelectedItemId(null);
  };

  const updateItem = (id: string, updates: Partial<PackItem>) => {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      items: cat.items.map(item => item.id === id ? { ...item, ...updates } : item)
    })));
  };

  const moveItemCategory = (itemId: string, newCategoryId: string) => {
    const item = categories.flatMap(c => c.items).find(i => i.id === itemId);
    const newCat = categories.find(c => c.id === newCategoryId);
    commitAction(`Moved ${item?.name || 'item'} to ${newCat?.title || 'new category'}`);
    setCategories(prev => {
      let movedItem: PackItem | undefined;
      // First pass: remove the item from its current category
      const removedFromPrev = prev.map(cat => {
        const itemIndex = cat.items.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
          movedItem = cat.items[itemIndex];
          const newItems = [...cat.items];
          newItems.splice(itemIndex, 1);
          return { ...cat, items: newItems };
        }
        return cat;
      });

      if (!movedItem) return prev;

      // Second pass: add to the new category
      return removedFromPrev.map(cat => {
        if (cat.id === newCategoryId) {
          return { ...cat, items: [...cat.items, movedItem!] };
        }
        return cat;
      });
    });
  };

  const updateLuggage = (id: string, updates: Partial<Luggage>) => {
    setLuggages(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleLuggageImageUpload = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateLuggage(id, { imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleAddLuggage = () => {
    if (!newLuggageName.trim()) return;
    commitAction(`Added bag: ${newLuggageName}`);
    setLuggages(prev => [...prev, { id: `lug_${Date.now()}`, name: newLuggageName.trim() }]);
    setNewLuggageName('');
  };

  const baseSetQty = changes;
  const selectedItem = categories.flatMap(c => c.items).find(i => i.id === selectedItemId);

  const getMissingCount = (priority: string) => {
    return categories
      .filter(c => priority === 'all' || c.priority === priority)
      .flatMap(c => c.items)
      .filter(i => !hiddenItems[i.id] && !checkedItems[i.id])
      .length;
  };

  const renderCategory = (cat: Category) => {
    if (filter !== 'all' && cat.priority !== filter) return null;

    const activeItems = cat.items.filter(item => !hiddenItems[item.id]);
    const hiddenCatItems = cat.items.filter(item => hiddenItems[item.id]);
    const isShowingHidden = showHiddenCats[cat.id];

    return (
      <div key={cat.id} className="category-block">
        <div className="category-header">
          <div className="category-title-area">
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <h3>{cat.title}</h3>
              <button className="btn-add-item-header" onClick={() => handleCreateItem(cat.id)} title="Add custom item">+</button>
            </div>
            {cat.priority && (
              <div style={{position: 'relative'}}>
                <span 
                  className="stars-badge" 
                  title={cat.priority.replace('-', ' ').toUpperCase()}
                  onClick={() => showPriorityToast(cat.id)}
                >
                  {cat.priority === 'must-have' ? '★★★' : cat.priority === 'nice-to-have' ? '★☆☆' : '★★☆'}
                </span>
                {activeToastId === cat.id && (
                  <div className="priority-toast">
                    {cat.priority.replace('-', ' ').toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isShowingHidden && (
              <button 
                className="btn-restore-all" 
                onClick={() => triggerConfirm('Click again to restore items', `restore_${cat.id}`, () => unhideAllInCategory(cat.id))}
              >
                ↺
              </button>
            )}
            {hiddenCatItems.length > 0 && (
              <button className={`badge-hidden ${isShowingHidden ? 'active' : ''}`} onClick={() => toggleCatHidden(cat.id)}>
                {isShowingHidden ? 'Hide' : `${hiddenCatItems.length} hidden`}
              </button>
            )}
          </div>
        </div>
        <ul>
          {activeItems.map(item => {
            const isBaseItem = item.id.startsWith('base_') && (item.id.includes('underwear') || item.id.includes('socks') || item.id.includes('tshirt'));
            const displayQty = isBaseItem ? baseSetQty : item.qty;
            const assignedLugIdx = luggages.findIndex(l => l.id === itemLuggage[item.id]);
            const isActiveSwipe = swipingItemId === item.id;

            return (
              <li 
                key={item.id} 
                className={`list-item ${checkedItems[item.id] ? 'checked' : ''} ${isActiveSwipe ? 'is-swiping' : ''}`}
                onTouchStart={(e) => handleTouchStart(item.id, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={(e) => handleTouchEnd(item.id, e)}
              >
                {assignedLugIdx !== -1 && <span className={`luggage-badge bag-color-${assignedLugIdx + 1}`}>{assignedLugIdx + 1}</span>}
                <div className={`swipe-background ${isActiveSwipe && swipeOffset > 0 ? 'bg-pack' : ''}`}>
                   <div className="swipe-hint left">→ Pack & Hide</div>
                   <div className="swipe-hint right">{getNextLuggageHint(item.id, 1)} ←</div>
                </div>
                <div 
                  className="item-row"
                  style={{ transform: isActiveSwipe ? `translateX(${swipeOffset}px)` : 'none' }}
                >
                  <div className="item-main">
                    <input type="checkbox" checked={!!checkedItems[item.id]} onChange={() => toggleCheck(item.id)} />
                    <div 
                      className="item-clickable-area" 
                      onClick={() => { if(!isSwiping.current) setSelectedItemId(item.id); }}
                    >
                      {displayQty ? <span className="item-qty">{displayQty}x </span> : null}
                      <span className="item-name">{item.name}</span>
                    </div>
                  </div>
                  <button className="btn-hide" onClick={() => hideItem(item.id)}>✕</button>
                </div>
              </li>
            );
          })}
          {isShowingHidden && hiddenCatItems.map(item => (
            <li key={item.id} className="list-item grayed-out">
              <div className="item-row">
                <div className="item-main"><span className="item-name" style={{ textDecoration: 'none', cursor: 'default' }}>{item.name}</span></div>
                <div className="hidden-actions">
                  <button className="btn-unhide" onClick={() => unhideItem(item.id)}>↺</button>
                  <button 
                    className="btn-delete" 
                    onClick={() => triggerConfirm(`Click again to delete ${item.name}`, `delete_${item.id}`, () => {
                      commitAction(`Deleted ${item.name}`);
                      setCategories(prev => prev.map(c => ({...c, items: c.items.filter(i => i.id !== item.id)})));
                      unhideItem(item.id);
                    })}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Swipe detection for menus
  const [menuTouchStart, setMenuTouchStart] = useState<{x: number, y: number} | null>(null);
  const [menuSwipeOffset, setMenuSwipeOffset] = useState<number>(0);

  const handleGlobalTouchStart = (e: React.TouchEvent) => {
    // Only capture if not touching a list item (handled separately)
    if ((e.target as HTMLElement).closest('.list-item') || (e.target as HTMLElement).closest('.modal-content') || (e.target as HTMLElement).closest('.item-card-modal')) return;
    setMenuTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setMenuSwipeOffset(0);
  };

  const handleGlobalTouchMove = (e: React.TouchEvent) => {
    if (!menuTouchStart) return;
    const dx = e.touches[0].clientX - menuTouchStart.x;
    setMenuSwipeOffset(dx);
  };

  const handleGlobalTouchEnd = (e: React.TouchEvent) => {
    if (!menuTouchStart) return;
    const dx = e.changedTouches[0].clientX - menuTouchStart.x;
    
    // Swipe left (open right menu or close left menu)
    if (dx < -75) {
      if (activeMenu === 'main') setActiveMenu('baggage');
      else if (activeMenu === 'settings') setActiveMenu('main');
    }
    // Swipe right (open left menu or close right menu)
    else if (dx > 75) {
      if (activeMenu === 'main') setActiveMenu('settings');
      else if (activeMenu === 'baggage') setActiveMenu('main');
    }
    
    setMenuTouchStart(null);
    setMenuSwipeOffset(0);
  };

  let leftMenuStyle: React.CSSProperties = {};
  let rightMenuStyle: React.CSSProperties = {};
  let isMenuSwiping = menuTouchStart !== null;

  if (isMenuSwiping) {
    if (activeMenu === 'main') {
      if (menuSwipeOffset > 0) leftMenuStyle.transform = `translateX(calc(-105% + ${menuSwipeOffset}px))`;
      if (menuSwipeOffset < 0) rightMenuStyle.transform = `translateX(calc(105% + ${menuSwipeOffset}px))`;
    } else if (activeMenu === 'settings') {
      if (menuSwipeOffset < 0) leftMenuStyle.transform = `translateX(${menuSwipeOffset}px)`;
    } else if (activeMenu === 'baggage') {
      if (menuSwipeOffset > 0) rightMenuStyle.transform = `translateX(${menuSwipeOffset}px)`;
    }
  }

  return (
    <div className="app-container" onTouchStart={handleGlobalTouchStart} onTouchMove={handleGlobalTouchMove} onTouchEnd={handleGlobalTouchEnd}>
      <header className={`app-header ${showHeader ? '' : 'hidden'}`}>
        <button className="header-icon-btn" onClick={() => setActiveMenu('settings')}>☰</button>
        <div className="header-title-area">
          <button onClick={undo} disabled={past.length === 0} className="header-undo-btn" title="Undo">↶</button>
          <h1>Crew Packing List</h1>
          <button onClick={redo} disabled={future.length === 0} className="header-undo-btn" title="Redo">↷</button>
        </div>
        <button className="header-icon-btn" onClick={() => setActiveMenu('baggage')}>🎒</button>
      </header>
      
      {activeMenu !== 'main' && <div className="menu-overlay" onClick={() => setActiveMenu('main')} />}

      {confirmToast && (
        <div className="confirm-toast-overlay">
          <div className="confirm-toast">
            {confirmToast.message}
          </div>
        </div>
      )}

      {/* Left Menu: Settings */}
      <div className={`side-menu left-menu ${activeMenu === 'settings' ? 'open' : ''} ${isMenuSwiping ? 'is-swiping' : ''}`} style={leftMenuStyle}>
        <div className="menu-header">
          <h2>Settings</h2>
          <button className="btn-close-menu" onClick={() => setActiveMenu('main')}>✕</button>
        </div>
        <div className="menu-content">
          <div className="menu-section">
            <label>Expected Showers</label>
            <div className="stepper-control">
              <button className="stepper-btn" onClick={() => updateChanges(Math.max(1, changes - 1))} disabled={changes <= 1}>−</button>
              <input type="number" className="stepper-input" value={changes} onChange={(e) => updateChanges(parseInt(e.target.value) || 1)} min={1} max={14} />
              <button className="stepper-btn" onClick={() => updateChanges(Math.min(14, changes + 1))} disabled={changes >= 14}>+</button>
            </div>
            <p className="controls-desc">Estimation: <strong>{baseSetQty} Base Sets</strong>. Instead of packing for every night, we estimate how many times you'll actually change base layers based on shower opportunities.</p>
          </div>

          <div className="menu-section">
            <label>Quick Filters</label>
            <p className="controls-desc">Show only specific items. The number shows how many items are still <strong>missing</strong> in that group.</p>
            <div className="filters-group" style={{marginTop: '10px'}}>
              <button className={`btn-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); setActiveMenu('main'); }}>Show All ({getMissingCount('all')})</button>
              <button className={`btn-filter ${filter === 'must-have' ? 'active' : ''} pri-must`} onClick={() => { setFilter('must-have'); setActiveMenu('main'); }}>★★★ Must ({getMissingCount('must-have')})</button>
              <button className={`btn-filter ${filter === 'should-have' ? 'active' : ''} pri-should`} onClick={() => { setFilter('should-have'); setActiveMenu('main'); }}>★★☆ Should ({getMissingCount('should-have')})</button>
              <button className={`btn-filter ${filter === 'nice-to-have' ? 'active' : ''} pri-nice`} onClick={() => { setFilter('nice-to-have'); setActiveMenu('main'); }}>★☆☆ Nice ({getMissingCount('nice-to-have')})</button>
            </div>
          </div>
          
          <div className="menu-section">
            <label>Cruise Presets</label>
            <p className="controls-desc" style={{color: '#b30000'}}><strong>Warning:</strong> Applying a preset will overwrite your current list! Select your cruise and role to fill in the recommended packing list.</p>
            <div className="preset-selectors" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <select className="modal-select" value={presetCruise} onChange={(e) => setPresetCruise(e.target.value)}>
                <option value="med_blueward_26">Mediterranean - BlueWard 26</option>
              </select>
              <div className="presets-group" style={{ width: '100%' }}>
                <button className="btn-preset" style={{flex: 1}} onClick={() => applyPreset(presetCruise, 'crew')}>Apply: Crew</button>
                <button className="btn-preset" style={{flex: 1}} onClick={() => applyPreset(presetCruise, 'captain')}>Apply: Captain</button>
              </div>
            </div>
          </div>

          <div className="menu-section">
            <label>App Installation</label>
            {deferredPrompt ? (
              <button 
                onClick={handleInstallClick} 
                className="btn-preset" 
                style={{ width: '100%', background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
              >
                📱 Install App to Home Screen
              </button>
            ) : (
              <p className="controls-desc">To install this app on your phone, tap your browser's menu (or the Share button on iOS) and select <strong>"Add to Home Screen"</strong>.</p>
            )}
          </div>

          <div className="menu-section global-actions-menu">
            <button onClick={() => { resetAll(); setActiveMenu('main'); }} className="btn-reset">Factory Reset List</button>
          </div>

          <div className="menu-section history-section">
            <div className="history-header">
              <label>Action History</label>
            </div>
            {past.length === 0 ? (
              <p className="controls-desc">No actions taken yet.</p>
            ) : (
              <ul className="history-log">
                {[...past].reverse().slice(0, 10).map((entry) => (
                  <li key={entry.id}>
                    <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                    <span className="log-msg">{entry.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Right Menu: Baggage Summary */}
      <div className={`side-menu right-menu ${activeMenu === 'baggage' ? 'open' : ''} ${isMenuSwiping ? 'is-swiping' : ''}`} style={rightMenuStyle}>
        <div className="menu-header">
          <h2>Luggage</h2>
          <button className="btn-close-menu" onClick={() => setActiveMenu('main')}>✕</button>
        </div>
        <div className="menu-content">
          <p className="controls-desc" style={{color: '#b30000', marginBottom: '15px'}}><strong>⚠️ No Hard Suitcases:</strong> Soft bags only! Rigid luggage is impossible to store on a boat. Bring a soft duffel.</p>
          <div className="luggage-lists">
            {luggages.map((lug, idx) => {
              const packedItems = categories.flatMap(c => c.items).filter(i => itemLuggage[i.id] === lug.id);
              return (
                <div key={lug.id} className="luggage-card">
                  <div className="luggage-card-header" onClick={() => setSelectedLuggageId(lug.id)}>
                    <h4><span className={`luggage-badge bag-color-${idx + 1}`}>{idx + 1}</span> {lug.name}</h4>
                    <button className="btn-small-action">✎ Edit</button>
                  </div>
                  {lug.imageUrl && <div className="luggage-img-preview"><img src={lug.imageUrl} alt={lug.name} /></div>}
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

      {/* Main View Modals */}
      {selectedItem && (
        <div className="modal-overlay" onClick={closeItemModal}>
          <div className="item-card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrapper">
                <input className="modal-title-input" autoFocus placeholder="Item Name..." value={selectedItem.name} onChange={(e) => updateItem(selectedItem.id, { name: e.target.value })} />
                <span className="edit-icon">✎</span>
              </div>
              <button className="btn-close-modal" onClick={closeItemModal}>✕</button>
            </div>
            <div className="modal-body">
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
                  <button className={`luggage-toggle-btn ${!itemLuggage[selectedItem.id] ? 'active' : ''}`} onClick={() => setItemLuggage(prev => { const next = {...prev}; delete next[selectedItem.id]; return next; })}>Unassigned</button>
                  {luggages.map((lug, idx) => (
                    <button key={lug.id} className={`luggage-toggle-btn ${itemLuggage[selectedItem.id] === lug.id ? 'active' : ''}`} onClick={() => setItemLuggage(prev => ({ ...prev, [selectedItem.id]: lug.id }))}>[{idx + 1}] {lug.name}</button>
                  ))}
                </div>
              </div>
              <div className="modal-field">
                <label>Description / Advice</label>
                <textarea 
                  className="modal-textarea auto-expand"
                  value={selectedItem.description || ''} 
                  onChange={(e) => {
                    updateItem(selectedItem.id, { description: e.target.value });
                    // Auto-expand logic
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
            </div>
          </div>
        </div>
      )}

      {selectedLuggageId && (() => {
        const lug = luggages.find(l => l.id === selectedLuggageId);
        if (!lug) return null;
        return (
          <div className="modal-overlay" onClick={() => setSelectedLuggageId(null)}>
            <div className="item-card-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-wrapper">
                  <input className="modal-title-input" value={lug.name} onChange={(e) => updateLuggage(lug.id, { name: e.target.value })} />
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
                    <input type="file" accept="image/*" id="lug-img-upload" className="file-input-hidden" onChange={(e) => handleLuggageImageUpload(lug.id, e.target.files?.[0] || null)} />
                    <label htmlFor="lug-img-upload" className="btn-upload-label">{lug.imageUrl ? 'Change Photo' : 'Upload Photo'}</label>
                    {lug.imageUrl && <button className="btn-remove-img" onClick={() => updateLuggage(lug.id, { imageUrl: undefined })}>Remove Photo</button>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="checklist-grid">
        <div className="checklist-column">
          {categories.filter(cat => ['docs', 'base', 'tough', 'outerwear'].includes(cat.id)).map(renderCategory)}
        </div>
        <div className="checklist-column">
          {categories.filter(cat => !['docs', 'base', 'tough', 'outerwear'].includes(cat.id)).map(renderCategory)}
        </div>
      </div>

      <footer className="app-footer"><a href="https://www.sailingcommunity.be/" target="_blank" rel="noopener noreferrer"><img src="/bsc.ico" alt="BSC" style={{ width: '20px', height: '20px', marginRight: '8px' }} />Belgian Sailing Community</a></footer>
    </div>
  );
}

export default App;