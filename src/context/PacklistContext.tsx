import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { 
  PackItem, 
  Category, 
  Warning, 
  Luggage, 
  AppSnapshot, 
  HistoryEntry,
  ItemViewFilter
} from '../types';
import { 
  PRESETS,
  getPresetData, 
  getInitialLuggageAssignments, 
  getPresetCategories 
} from '../utils/presetUtils';

interface PacklistContextType {
  changes: number;
  updateChanges: (newVal: number) => void;
  showHeader: boolean;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  warnings: Warning[];
  checkedItems: Record<string, boolean>;
  setCheckedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  hiddenItems: Record<string, boolean>;
  luggages: Luggage[];
  setLuggages: React.Dispatch<React.SetStateAction<Luggage[]>>;
  itemLuggage: Record<string, string>;
  setItemLuggage: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  selectedLuggageId: string | null;
  setSelectedLuggageId: (id: string | null) => void;
  newLuggageName: string;
  setNewLuggageName: (name: string) => void;
  showHiddenCats: Record<string, boolean>;
  toggleCatHidden: (catId: string) => void;
  filter: 'all' | 'must-have' | 'should-have' | 'nice-to-have';
  setFilter: (filter: 'all' | 'must-have' | 'should-have' | 'nice-to-have') => void;
  itemViewFilter: ItemViewFilter;
  setItemViewFilter: React.Dispatch<React.SetStateAction<ItemViewFilter>>;
  activeMenu: 'main' | 'settings' | 'baggage';
  setActiveMenu: (menu: 'main' | 'settings' | 'baggage') => void;
  past: HistoryEntry[];
  future: HistoryEntry[];
  undo: () => void;
  redo: () => void;
  commitAction: (message: string) => void;
  toggleCheck: (id: string) => void;
  hideItem: (id: string) => void;
  unhideItem: (id: string) => void;
  unhideAllInCategory: (catId: string) => void;
  cycleLuggage: (itemId: string, direction: 1 | -1) => void;
  getNextLuggageHint: (itemId: string, direction: 1 | -1) => string;
  applyPreset: (cruise: string, role: 'crew' | 'captain') => void;
  resetAll: () => void;
  handleCreateItem: (categoryId: string) => void;
  handleAddSubItem: (parentId: string) => void;
  updateItem: (id: string, updates: Partial<PackItem>) => void;
  deleteItem: (id: string, parentId?: string) => void;
  moveItemCategory: (itemId: string, newCategoryId: string) => void;
  updateLuggage: (id: string, updates: Partial<Luggage>) => void;
  handleAddLuggage: () => void;
  getMissingCount: (priority: string) => number;
  deferredPrompt: any;
  handleInstallClick: () => Promise<void>;
  confirmToast: {message: string, actionId: string} | null;
  triggerConfirm: (message: string, actionId: string, onConfirm: () => void) => void;
  activeToastId: string | null;
  showPriorityToast: (catId: string) => void;
  handleGlobalTouchStart: (e: React.TouchEvent) => void;
  handleGlobalTouchMove: (e: React.TouchEvent) => void;
  handleGlobalTouchEnd: (e: React.TouchEvent) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  setCategoryLuggage: (categoryId: string, luggageId: string) => void;
  packAndHideCategory: (categoryId: string) => void;
  hideCategoryItemsAction: (categoryId: string) => void;
  getSubItemCounts: (item: PackItem) => { packed: number, total: number };
  getMenuStyles: () => { leftMenuStyle: React.CSSProperties, rightMenuStyle: React.CSSProperties, isMenuSwiping: boolean };
}

const PacklistContext = createContext<PacklistContextType | undefined>(undefined);

export const PacklistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const defaultPresetId = Object.keys(PRESETS)[0] || '';

  const [changes, setChanges] = useState<number>(() => {
    const saved = localStorage.getItem('sailingPacklist_showers_v16');
    return saved ? parseInt(saved) : (getPresetData(defaultPresetId).showers || 3);
  });
  
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
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
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
    return saved ? JSON.parse(saved) : getPresetCategories(defaultPresetId, 'crew');
  });
  const [warnings, setWarnings] = useState<Warning[]>(() => {
    const saved = localStorage.getItem('sailingPacklist_warnings_v16');
    return saved ? JSON.parse(saved) : getPresetData(defaultPresetId).warnings || [];
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
    let loaded = saved ? JSON.parse(saved) : getPresetData(defaultPresetId).luggages || [];
    // Migrate old emoji icons to new string IDs
    loaded = loaded.map((lug: Luggage) => {
      if (lug.icon === '🧳') return { ...lug, icon: 'duffel' };
      if (lug.icon === '🎒') return { ...lug, icon: 'backpack' };
      if (lug.icon === '🧍') return { ...lug, icon: 'on_person' };
      return lug;
    });
    return loaded;
  });
  const [itemLuggage, setItemLuggage] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('sailingPacklist_itemLuggage_v16');
    return saved ? JSON.parse(saved) : getInitialLuggageAssignments(defaultPresetId);
  });

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedLuggageId, setSelectedLuggageId] = useState<string | null>(null);
  const [newLuggageName, setNewLuggageName] = useState('');
  const [showHiddenCats, setShowHiddenCats] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'must-have' | 'should-have' | 'nice-to-have'>('all');
  const [itemViewFilter, setItemViewFilter] = useState<ItemViewFilter>('all');
  const [activeMenu, setActiveMenu] = useState<'main' | 'settings' | 'baggage'>('main');
  const [activeToastId, setActiveToastId] = useState<string | null>(null);

  // Global Swipe detection for menus
  const [menuTouchStart, setMenuTouchStart] = useState<{x: number, y: number} | null>(null);
  const [menuSwipeOffset, setMenuSwipeOffset] = useState<number>(0);

  const handleGlobalTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.list-item') || (e.target as HTMLElement).closest('.modal-content') || (e.target as HTMLElement).closest('.modal-swipe-container') || (e.target as HTMLElement).closest('.item-card-modal')) return;
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
    if (dx < -75) {
      if (activeMenu === 'main') setActiveMenu('baggage');
      else if (activeMenu === 'settings') setActiveMenu('main');
    } else if (dx > 75) {
      if (activeMenu === 'main') setActiveMenu('settings');
      else if (activeMenu === 'baggage') setActiveMenu('main');
    }
    setMenuTouchStart(null);
    setMenuSwipeOffset(0);
  };

  const getMenuStyles = () => {
    let leftMenuStyle: React.CSSProperties = {};
    let rightMenuStyle: React.CSSProperties = {};
    if (menuTouchStart) {
      if (activeMenu === 'main') {
        if (menuSwipeOffset > 0) leftMenuStyle.transform = `translateX(calc(-105% + ${menuSwipeOffset}px))`;
        if (menuSwipeOffset < 0) rightMenuStyle.transform = `translateX(calc(105% + ${menuSwipeOffset}px))`;
      } else if (activeMenu === 'settings') {
        if (menuSwipeOffset < 0) leftMenuStyle.transform = `translateX(${menuSwipeOffset}px)`;
      } else if (activeMenu === 'baggage') {
        if (menuSwipeOffset > 0) rightMenuStyle.transform = `translateX(${menuSwipeOffset}px)`;
      }
    }
    return { leftMenuStyle, rightMenuStyle, isMenuSwiping: !!menuTouchStart };
  };

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

  useEffect(() => {
    setConfirmToast(null);
  }, [activeMenu, selectedItemId]);

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

  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  const commitAction = useCallback((message: string) => {
    const snapshot: AppSnapshot = { changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage };
    setPast(prev => [...prev.slice(-29), { id: Date.now().toString(), message, timestamp: Date.now(), snapshot }]);
    setFuture([]);
  }, [changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage]);

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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

  const findItemDeep = (id: string): PackItem | undefined => {
    for (const cat of categories) {
      for (const item of cat.items) {
        if (item.id === id) return item;
        if (item.subItems) {
          const sub = item.subItems.find(s => s.id === id);
          if (sub) return sub;
        }
      }
    }
    return undefined;
  };

  const toggleCheck = (id: string) => {
    const item = findItemDeep(id);
    commitAction(checkedItems[id] ? `Unchecked ${item?.name || 'item'}` : `Checked ${item?.name || 'item'}`);
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const hideItem = (id: string) => {
    const item = findItemDeep(id);
    commitAction(`Hid ${item?.name || 'item'}`);
    setHiddenItems(prev => ({ ...prev, [id]: true }));
  };
  
  const unhideItem = (id: string) => {
    const item = findItemDeep(id);
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
    const item = findItemDeep(itemId);
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

  const getNextLuggageHint = (itemId: string, direction: 1 | -1) => {
    const currentLugId = itemLuggage[itemId];
    const currentIndex = luggages.findIndex(l => l.id === currentLugId);
    const total = luggages.length + 1;
    let virtIndex = currentIndex === -1 ? 0 : currentIndex + 1;
    let nextVirt = (virtIndex + direction) % total;
    if (nextVirt < 0) nextVirt += total;
    if (nextVirt === 0) return 'Unassign luggage';
    return `Put in ${luggages[nextVirt - 1]?.name}` || 'Unassign luggage';
  };

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
      setCategories(getPresetCategories(defaultPresetId, 'crew'));
      setWarnings(getPresetData(defaultPresetId).warnings || []);
      setHiddenItems({});
      setCheckedItems({});
      setItemLuggage(getInitialLuggageAssignments(defaultPresetId));
      setLuggages(getPresetData(defaultPresetId).luggages || []);
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

  const handleAddSubItem = (parentId: string) => {
    commitAction('Added new sub-item');
    const newId = `custom_sub_${Date.now()}`;
    setCategories(prev => prev.map(cat => ({
      ...cat,
      items: cat.items.map(item => {
        if (item.id === parentId) {
          return {
            ...item,
            subItems: [...(item.subItems || []), { id: newId, name: '' }]
          };
        }
        return item;
      })
    })));
    setSelectedItemId(newId);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    commitAction('Updated category');
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = (id: string) => {
    commitAction('Deleted category');
    setCategories(prev => prev.filter(c => c.id !== id));
    setSelectedCategoryId(null);
  };

  const setCategoryLuggage = (categoryId: string, luggageId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    commitAction(`Moved ${cat.title} to bag`);
    setItemLuggage(prev => {
      const next = { ...prev };
      const applyLuggage = (items: PackItem[]) => {
        items.forEach(item => {
          next[item.id] = luggageId;
          if (item.subItems) applyLuggage(item.subItems);
        });
      };
      applyLuggage(cat.items);
      return next;
    });
  };

  const packAndHideCategory = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    commitAction(`Packed & hid ${cat.title}`);
    setCheckedItems(prevChecked => {
      const nextChecked = { ...prevChecked };
      const applyCheck = (items: PackItem[]) => {
        items.forEach(item => {
          nextChecked[item.id] = true;
          if (item.subItems) applyCheck(item.subItems);
        });
      };
      applyCheck(cat.items);
      return nextChecked;
    });
    setHiddenItems(prevHidden => {
      const nextHidden = { ...prevHidden };
      const applyHide = (items: PackItem[]) => {
        items.forEach(item => {
          nextHidden[item.id] = true;
          if (item.subItems) applyHide(item.subItems);
        });
      };
      applyHide(cat.items);
      return nextHidden;
    });
  };

  const hideCategoryItemsAction = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    commitAction(`Hid all in ${cat.title}`);
    setHiddenItems(prevHidden => {
      const nextHidden = { ...prevHidden };
      const applyHide = (items: PackItem[]) => {
        items.forEach(item => {
          nextHidden[item.id] = true;
          if (item.subItems) applyHide(item.subItems);
        });
      };
      applyHide(cat.items);
      return nextHidden;
    });
  };

  const updateItem = (id: string, updates: Partial<PackItem>) => {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      items: cat.items.map(item => {
        if (item.id === id) return { ...item, ...updates };
        if (item.subItems) return { ...item, subItems: item.subItems.map(sub => sub.id === id ? { ...sub, ...updates } : sub) };
        return item;
      })
    })));
  };

  const deleteItem = (id: string, parentId?: string) => {
    const item = findItemDeep(id);
    commitAction(`Deleted ${item?.name || 'item'}`);
    setCategories(prev => prev.map(c => {
      if (parentId) {
        return { ...c, items: c.items.map(i => i.id === parentId ? { ...i, subItems: i.subItems?.filter(s => s.id !== id) } : i) };
      }
      return { ...c, items: c.items.filter(i => i.id !== id) };
    }));
  };

  const moveItemCategory = (itemId: string, newCategoryId: string) => {
    const item = categories.flatMap(c => c.items).find(i => i.id === itemId);
    const newCat = categories.find(c => c.id === newCategoryId);
    commitAction(`Moved ${item?.name || 'item'} to ${newCat?.title || 'new category'}`);
    setCategories(prev => {
      let movedItem: PackItem | undefined;
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

  const handleAddLuggage = () => {
    if (!newLuggageName.trim()) return;
    const icons = ['default', 'briefcase', 'duffel', 'backpack'];
    const colors = ['#0074D9', '#FF851B', '#B10DC9', '#39CCCC', '#F012BE', '#85144b', '#3D9970'];
    const newIndex = luggages.length;
    commitAction(`Added bag: ${newLuggageName}`);
    setLuggages(prev => [...prev, { 
      id: `lug_${Date.now()}`, 
      name: newLuggageName.trim(),
      icon: icons[newIndex % icons.length],
      color: colors[newIndex % colors.length]
    }]);
    setNewLuggageName('');
  };

  const getMissingCount = (priority: string) => {
    return categories
      .filter(c => priority === 'all' || c.priority === priority)
      .flatMap(c => c.items)
      .filter(i => !hiddenItems[i.id] && !checkedItems[i.id])
      .length;
  };

  const showPriorityToast = (catId: string) => {
    setActiveToastId(catId);
    setTimeout(() => {
      setActiveToastId(prev => prev === catId ? null : prev);
    }, 2000);
  };

  const getSubItemCounts = useCallback((item: PackItem) => {
    let packed = 0;
    let total = 0;

    const countRecursive = (items: PackItem[]) => {
      items.forEach(subItem => {
        if (subItem.subItems) {
          countRecursive(subItem.subItems);
        } else {
          total++;
          if (checkedItems[subItem.id]) {
            packed++;
          }
        }
      });
    };

    if (item.subItems) {
      countRecursive(item.subItems);
    }
    return { packed, total };
  }, [checkedItems]);

  return (
    <PacklistContext.Provider value={{
      changes, updateChanges, showHeader, categories, setCategories, warnings, checkedItems, setCheckedItems,
      hiddenItems, luggages, setLuggages, itemLuggage, setItemLuggage, selectedItemId, setSelectedItemId,
      selectedCategoryId, setSelectedCategoryId,
      selectedLuggageId, setSelectedLuggageId, newLuggageName, setNewLuggageName, showHiddenCats, toggleCatHidden,
      filter, setFilter, itemViewFilter, setItemViewFilter, activeMenu, setActiveMenu, past, future, undo, redo, commitAction, toggleCheck, hideItem,
      unhideItem, unhideAllInCategory, cycleLuggage, getNextLuggageHint, applyPreset, resetAll, handleCreateItem, handleAddSubItem,
      updateItem, deleteItem, moveItemCategory, updateCategory, deleteCategory, setCategoryLuggage, packAndHideCategory, hideCategoryItemsAction, updateLuggage, handleAddLuggage, getMissingCount, deferredPrompt, handleInstallClick,
      confirmToast, triggerConfirm, activeToastId, showPriorityToast, getSubItemCounts,
      handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd, getMenuStyles
      }}>
      {children}
    </PacklistContext.Provider>
  );
};

export const usePacklist = () => {
  const context = useContext(PacklistContext);
  if (!context) throw new Error('usePacklist must be used within a PacklistProvider');
  return context;
};
