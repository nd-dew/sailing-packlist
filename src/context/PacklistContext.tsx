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
import type { SharedPayload } from '../utils/shareUtils';

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
  toggleCheck: (id: string, e?: React.MouseEvent | React.TouchEvent | Event) => void;
  toggleParentItem: (id: string, willBeChecked: boolean, e?: React.MouseEvent | React.TouchEvent | Event) => void;
  hideItem: (id: string) => void;
  unhideItem: (id: string) => void;
  unhideAllInCategory: (catId: string) => void;
  cycleLuggage: (itemId: string, direction: 1 | -1) => void;
  getNextLuggageHint: (itemId: string, direction: 1 | -1) => string;
  applyPreset: (cruise: string, role: 'crew' | 'captain') => void;
  executeApplyPreset: (cruise: string, role: 'crew' | 'captain') => void;
  pendingPreset: { cruise: string, role: 'crew' | 'captain' } | null;
  setPendingPreset: (preset: { cruise: string, role: 'crew' | 'captain' } | null) => void;
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
  handleCreateCategory: (title?: string) => void;
  setCategoryLuggage: (categoryId: string, luggageId: string) => void;
  packAndHideCategory: (categoryId: string) => void;
  hideCategoryItemsAction: (categoryId: string) => void;
  unpackCategoryItemsAction: (categoryId: string) => void;
  deleteLuggage: (id: string) => void;
  reorderLuggage: (id: string, direction: 1 | -1) => void;
  packAndHideLuggageItems: (luggageId: string) => void;
  unpackLuggageItems: (luggageId: string) => void;
  hideLuggageItems: (luggageId: string) => void;
  getSubItemCounts: (item: PackItem) => { packed: number, total: number };
  getMenuStyles: () => { leftMenuStyle: React.CSSProperties, rightMenuStyle: React.CSSProperties, isMenuSwiping: boolean };
  particles: { id: number; x: number; y: number; type: 'to-green' | 'to-red' }[];
  triggerParticle: (x: number, y: number, type: 'to-green' | 'to-red') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  importData: (data: any) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playPopSound: (type?: 'click' | 'pop') => void;
  loadSharedState: (shared: SharedPayload) => void;
  getSharePayload: () => SharedPayload;
  cruiseDescription: string;
  setCruiseDescription: (desc: string) => void;
}

const PacklistContext = createContext<PacklistContextType | undefined>(undefined);

export const PacklistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const defaultPresetId = PRESETS['zeeland_fox_22'] ? 'zeeland_fox_22' : (Object.keys(PRESETS)[0] || '');

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sailingPacklist_sound_v16');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sailingPacklist_sound_v16', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const playPopSound = useCallback((type: 'click' | 'pop' = 'pop') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      }
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, [soundEnabled]);

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sailingPacklist_theme_override');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const setTheme = (newTheme: 'light' | 'dark') => {
    localStorage.setItem('sailingPacklist_theme_override', newTheme);
    setThemeState(newTheme);
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const override = localStorage.getItem('sailingPacklist_theme_override');
      if (!override) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

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
  const [pendingPreset, setPendingPreset] = useState<{ cruise: string, role: 'crew' | 'captain' } | null>(null);
  const [cruiseDescription, setCruiseDescription] = useState<string>(() => {
    const saved = localStorage.getItem('sailingPacklist_cruiseDescription_v16');
    return saved !== null ? saved : '';
  });

  useEffect(() => {
    localStorage.setItem('sailingPacklist_cruiseDescription_v16', cruiseDescription);
  }, [cruiseDescription]);

  const [activeToastId, setActiveToastId] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; type: 'to-green' | 'to-red' }[]>([]);

  const triggerParticle = (x: number, y: number, type: 'to-green' | 'to-red') => {
    const targetId = type === 'to-green' ? 'stat-green' : 'stat-red';
    const targetEl = document.getElementById(targetId);
    let targetX = type === 'to-green' ? window.innerWidth / 2 - 35 : window.innerWidth / 2 + 35;
    let targetY = 25;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }

    const id = Date.now() + Math.random();
    setParticles(prev => [...prev, { id, x, y, type, targetX, targetY } as any]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 600); // synced with 0.6s CSS animation
  };

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
    setPast(prev => [...prev.slice(-29), { id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, message, timestamp: Date.now(), snapshot }]);
    setFuture([]);
  }, [changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    playPopSound('click');
    const next = future[0];
    const currentSnapshot: AppSnapshot = { changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage };
    setPast(prev => [...prev, { id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, message: next.message, timestamp: Date.now(), snapshot: currentSnapshot }]);
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
    playPopSound('click');
    const last = past[past.length - 1];
    const currentSnapshot: AppSnapshot = { changes, categories, warnings, checkedItems, hiddenItems, luggages, itemLuggage };
    setFuture(prev => [{ id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, message: last.message, timestamp: Date.now(), snapshot: currentSnapshot }, ...prev]);
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

  const toggleCheck = (id: string, e?: React.MouseEvent | React.TouchEvent | Event) => {
    const item = findItemDeep(id);
    const willBeChecked = !checkedItems[id];
    commitAction(willBeChecked ? `Checked ${item?.name || 'item'}` : `Unchecked ${item?.name || 'item'}`);
    
    if (e && willBeChecked) {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && (e as React.TouchEvent).touches.length > 0) {
        clientX = (e as React.TouchEvent).touches[0].clientX;
        clientY = (e as React.TouchEvent).touches[0].clientY;
      } else if ('changedTouches' in e && (e as React.TouchEvent).changedTouches.length > 0) {
        clientX = (e as React.TouchEvent).changedTouches[0].clientX;
        clientY = (e as React.TouchEvent).changedTouches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }
      if (clientX > 0 || clientY > 0) {
        triggerParticle(clientX, clientY, 'to-green');
      }
    } else if (e && !willBeChecked) {
        let clientX = 0;
        let clientY = 0;
        if ('touches' in e && (e as React.TouchEvent).touches.length > 0) {
          clientX = (e as React.TouchEvent).touches[0].clientX;
          clientY = (e as React.TouchEvent).touches[0].clientY;
        } else if ('changedTouches' in e && (e as React.TouchEvent).changedTouches.length > 0) {
          clientX = (e as React.TouchEvent).changedTouches[0].clientX;
          clientY = (e as React.TouchEvent).changedTouches[0].clientY;
        } else if ('clientX' in e) {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
        }
        if (clientX > 0 || clientY > 0) {
          triggerParticle(clientX, clientY, 'to-red');
        }
    }

    setCheckedItems(prev => ({ ...prev, [id]: willBeChecked }));
  };

  const toggleParentItem = (id: string, willBeChecked: boolean, e?: React.MouseEvent | React.TouchEvent | Event) => {
    const parent = findItemDeep(id);
    if (!parent || !parent.subItems) return;

    commitAction(willBeChecked ? `Checked all in ${parent.name}` : `Unchecked all in ${parent.name}`);

    setCheckedItems(prev => {
      const next = { ...prev };
      const applyCheck = (items: PackItem[]) => {
        items.forEach(sub => {
          next[sub.id] = willBeChecked;
          if (sub.subItems) applyCheck(sub.subItems);
        });
      };
      applyCheck(parent.subItems!);
      next[id] = willBeChecked;
      return next;
    });

    if (e) {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && (e as React.TouchEvent).touches.length > 0) {
        clientX = (e as React.TouchEvent).touches[0].clientX;
        clientY = (e as React.TouchEvent).touches[0].clientY;
      } else if ('changedTouches' in e && (e as React.TouchEvent).changedTouches.length > 0) {
        clientX = (e as React.TouchEvent).changedTouches[0].clientX;
        clientY = (e as React.TouchEvent).changedTouches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }

      if (clientX > 0 || clientY > 0) {
        let count = 0;
        const countItems = (items: PackItem[]) => {
          items.forEach(sub => {
            if (sub.subItems) {
              countItems(sub.subItems);
            } else {
              count++;
              setTimeout(() => {
                const offsetX = (Math.random() - 0.5) * 60;
                const offsetY = (Math.random() - 0.5) * 60;
                triggerParticle(clientX + offsetX, clientY + offsetY, willBeChecked ? 'to-green' : 'to-red');
              }, count * 50); // 50ms delay per particle for a staggered burst effect
            }
          });
        };
        countItems(parent.subItems);
      }
    }
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
    setPendingPreset({ cruise, role });
  };

  const executeApplyPreset = (cruise: string, role: 'crew' | 'captain') => {
    setCategories(getPresetCategories(cruise, role));
    setWarnings(getPresetData(cruise).warnings || []);
    setHiddenItems({});
    setCheckedItems({});
    setItemLuggage(getInitialLuggageAssignments(cruise));
    setLuggages(getPresetData(cruise).luggages || []);
    setCruiseDescription(''); // reset custom description to fallback to new preset defaults
    commitAction(`Reset list to ${role.toUpperCase()} preset`);
    setPendingPreset(null);
    setActiveMenu('main');
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

  const importData = (data: any) => {
    if (!data || data.version !== '1.0' || !data.categories) {
      alert('Invalid or incompatible packing list data file.');
      return;
    }
    if (confirm('Importing this data will overwrite your current list. Continue?')) {
      setChanges(data.changes || 3);
      setCategories(data.categories || []);
      setLuggages(data.luggages || []);
      setItemLuggage(data.itemLuggage || {});
      setCheckedItems(data.checkedItems || {});
      setHiddenItems(data.hiddenItems || {});
      commitAction('Imported list data');
      setActiveMenu('main');
    }
  };

  const getSharePayload = (): SharedPayload => {
    const defaultData = getPresetData(defaultPresetId);
    
    const presetItemIds: string[] = [];
    defaultData.categories.forEach((cat: any) => {
      cat.items.forEach((item: any) => {
        presetItemIds.push(item.id);
      });
    });

    const activeCats = categories.map((cat: Category) => {
      const isPresetCat = defaultData.categories.some((c: any) => c.id === cat.id);
      if (isPresetCat) {
        return cat.id;
      } else {
        return {
          id: cat.id,
          title: cat.title,
          priority: cat.priority
        };
      }
    });

    const luggageIdArray = luggages.map(lug => lug.id);
    const luggageIndices = presetItemIds.map(itemId => {
      // Check if item is present in categories and NOT hidden
      const isPresent = categories.some((cat: Category) => cat.items.some((item: PackItem) => item.id === itemId));
      const isHidden = !!hiddenItems[itemId];

      if (!isPresent || isHidden) {
        return -2; // Special value indicating deleted or hidden default item!
      }

      const assignedLuggageId = itemLuggage[itemId];
      if (!assignedLuggageId) return -1;
      return luggageIdArray.indexOf(assignedLuggageId);
    });

    const customSharedItems: { n: string; cat: string; b: number }[] = [];
    categories.forEach((cat: Category) => {
      cat.items.forEach((item: PackItem) => {
        const isCustom = !presetItemIds.includes(item.id);
        if (isCustom) {
          const assignedLuggageId = itemLuggage[item.id];
          const bagIndex = assignedLuggageId ? luggageIdArray.indexOf(assignedLuggageId) : -1;
          customSharedItems.push({
            n: item.name,
            cat: cat.id,
            b: bagIndex
          });
        }
      });
    });

    return {
      v: 1,
      p: defaultPresetId,
      d: cruiseDescription || undefined,
      lugs: luggages.map(lug => ({
        id: lug.id,
        name: lug.name,
        icon: lug.icon || 'default',
        color: lug.color || '#666'
      })),
      cats: activeCats,
      l: luggageIndices,
      c: customSharedItems.length > 0 ? customSharedItems : undefined
    };
  };

  const loadSharedState = (shared: SharedPayload) => {
    playPopSound('click');

    const newLuggages: Luggage[] = shared.lugs.map(lug => ({
      id: lug.id,
      name: lug.name,
      icon: lug.icon,
      color: lug.color
    }));
    setLuggages(newLuggages);

    const basePresetId = shared.p || defaultPresetId;
    const baseCategories = getPresetCategories(basePresetId, 'crew'); 
    
    const defaultData = getPresetData(basePresetId);
    const presetItems: PackItem[] = [];
    defaultData.categories.forEach((cat: any) => {
      cat.items.forEach((item: any) => {
        presetItems.push(item);
      });
    });

    const newLocalItemLuggage: Record<string, string> = {};
    const newHiddenItems: Record<string, boolean> = {};

    shared.l.forEach((bagIndex, itemIndex) => {
      const presetItem = presetItems[itemIndex];
      if (presetItem) {
        if (bagIndex === -2) {
          newHiddenItems[presetItem.id] = true;
        } else if (bagIndex >= 0 && bagIndex < newLuggages.length) {
          const targetBagId = newLuggages[bagIndex].id;
          newLocalItemLuggage[presetItem.id] = targetBagId;
        }
      }
    });

    const finalCategories: Category[] = [];
    shared.cats.forEach((catRef: any) => {
      if (typeof catRef === 'string') {
        const baseCat = baseCategories.find((c: Category) => c.id === catRef);
        if (baseCat) {
          finalCategories.push({
            ...baseCat,
            items: [...baseCat.items]
          });
        }
      } else {
        finalCategories.push({
          id: catRef.id,
          title: catRef.title,
          priority: catRef.priority,
          items: []
        });
      }
    });

    if (shared.c) {
      shared.c.forEach(custom => {
        let targetCat = finalCategories.find((c: Category) => c.id === custom.cat);
        if (!targetCat) {
          targetCat = finalCategories.find((c: Category) => c.title.toLowerCase().includes(custom.cat.toLowerCase()));
        }
        
        if (targetCat) {
          const customId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          targetCat.items.push({
            id: customId,
            name: custom.n,
            qty: 1
          });

          if (custom.b >= 0 && custom.b < newLuggages.length) {
            newLocalItemLuggage[customId] = newLuggages[custom.b].id;
          }
        }
      });
    }

    setCategories(finalCategories);
    setItemLuggage(newLocalItemLuggage);
    setCheckedItems({});
    setHiddenItems(newHiddenItems);
    setCruiseDescription(shared.d || '');
    
    commitAction('Loaded shared list from Skipper');
    setActiveMenu('main');
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
    playPopSound('pop');
    commitAction('Deleted category');
    setCategories(prev => prev.filter(c => c.id !== id));
    setSelectedCategoryId(null);
  };

  const handleCreateCategory = (title?: string) => {
    playPopSound('click');
    
    let finalTitle = title?.trim();
    if (!finalTitle) {
      const baseName = "New Category";
      let counter = 1;
      finalTitle = baseName;
      while (categories.some(c => c.title.toLowerCase() === finalTitle!.toLowerCase())) {
        counter++;
        finalTitle = `${baseName} ${counter}`;
      }
    }

    commitAction(`Created category ${finalTitle}`);
    const newId = `cat_custom_${Date.now()}`;
    setCategories(prev => [...prev, {
      id: newId,
      title: finalTitle!,
      priority: 'should-have',
      items: [],
      isCustom: true
    }]);
  };

  const setCategoryLuggage = (categoryId: string, luggageId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    playPopSound('pop');
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
    playPopSound('click');
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
    playPopSound('pop');
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

  const unpackCategoryItemsAction = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    playPopSound('click');
    commitAction(`Unpacked all in ${cat.title}`);
    setCheckedItems(prevChecked => {
      const nextChecked = { ...prevChecked };
      const applyUncheck = (items: PackItem[]) => {
        items.forEach(item => {
          nextChecked[item.id] = false;
          if (item.subItems) applyUncheck(item.subItems);
        });
      };
      applyUncheck(cat.items);
      return nextChecked;
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
    playPopSound('pop');
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

  const deleteLuggage = (id: string) => {
    playPopSound('pop');
    const lug = luggages.find(l => l.id === id);
    commitAction(`Deleted bag ${lug?.name || ''}`);
    setLuggages(prev => prev.filter(l => l.id !== id));
    setItemLuggage(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(itemId => {
        if (next[itemId] === id) delete next[itemId];
      });
      return next;
    });
    setSelectedLuggageId(null);
  };

  const reorderLuggage = (id: string, direction: 1 | -1) => {
    playPopSound('click');
    setLuggages(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      
      const nextLuggages = [...prev];
      const temp = nextLuggages[idx];
      nextLuggages[idx] = nextLuggages[nextIdx];
      nextLuggages[nextIdx] = temp;
      return nextLuggages;
    });
    commitAction('Reordered luggage');
  };

  const packAndHideLuggageItems = (luggageId: string) => {
    const lug = luggages.find(l => l.id === luggageId);
    if (!lug) return;
    playPopSound('click');
    commitAction(`Packed & hid bag ${lug.name}`);
    
    const itemsInBag = Object.keys(itemLuggage).filter(itemId => itemLuggage[itemId] === luggageId);
    
    setCheckedItems(prev => {
      const next = { ...prev };
      itemsInBag.forEach(id => next[id] = true);
      return next;
    });
    setHiddenItems(prev => {
      const next = { ...prev };
      itemsInBag.forEach(id => next[id] = true);
      return next;
    });
  };

  const unpackLuggageItems = (luggageId: string) => {
    const lug = luggages.find(l => l.id === luggageId);
    if (!lug) return;
    playPopSound('click');
    commitAction(`Unpacked bag ${lug.name}`);
    
    const itemsInBag = Object.keys(itemLuggage).filter(itemId => itemLuggage[itemId] === luggageId);
    setCheckedItems(prev => {
      const next = { ...prev };
      itemsInBag.forEach(id => next[id] = false);
      return next;
    });
  };

  const hideLuggageItems = (luggageId: string) => {
    const lug = luggages.find(l => l.id === luggageId);
    if (!lug) return;
    playPopSound('pop');
    commitAction(`Hid bag ${lug.name}`);
    
    const itemsInBag = Object.keys(itemLuggage).filter(itemId => itemLuggage[itemId] === luggageId);
    setHiddenItems(prev => {
      const next = { ...prev };
      itemsInBag.forEach(id => next[id] = true);
      return next;
    });
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
      filter, setFilter, itemViewFilter, setItemViewFilter, activeMenu, setActiveMenu, past, future, undo, redo, commitAction, toggleCheck, toggleParentItem, hideItem,
      unhideItem, unhideAllInCategory, cycleLuggage, getNextLuggageHint, applyPreset, executeApplyPreset, pendingPreset, setPendingPreset, resetAll, handleCreateItem, handleAddSubItem,
      updateItem, deleteItem, moveItemCategory, updateCategory, deleteCategory, handleCreateCategory, setCategoryLuggage, packAndHideCategory, hideCategoryItemsAction, unpackCategoryItemsAction, updateLuggage, deleteLuggage, reorderLuggage, packAndHideLuggageItems, unpackLuggageItems, hideLuggageItems, handleAddLuggage, getMissingCount, deferredPrompt, handleInstallClick,
      confirmToast, triggerConfirm, activeToastId, showPriorityToast, getSubItemCounts,
      handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd, getMenuStyles,
      particles, triggerParticle, theme, setTheme, importData, loadSharedState, getSharePayload,
      cruiseDescription, setCruiseDescription,
      soundEnabled, setSoundEnabled, playPopSound
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
