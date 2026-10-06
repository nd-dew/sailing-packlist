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
import {
  loadInitialTrips, loadTripData, saveTripData, saveTripIndex, removeTripData, newTripId, uniqueTripName,
  buildPresetTripData, buildEmptyTripData, buildSharedTripData, tripToPresetYaml,
  type TripMeta, type TripData
} from '../utils/tripStore';
import { isDragActive } from '../hooks/useListDrag';

interface PacklistContextType {
  changes: number;
  updateChanges: (newVal: number) => void;
  showHeader: boolean;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  warnings: Warning[];
  checkedItems: Record<string, boolean>;
  setCheckedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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
  collapsedCats: Record<string, boolean>;
  setCatCollapsed: (catId: string, collapsed: boolean) => void;
  swipeHintItemId: string | null;
  setSwipeHintItemId: (id: string | null) => void;
  markSwipeLearned: () => void;
  layoutColumns: LayoutColumns;
  setLayoutColumns: (cols: LayoutColumns) => void;
  density: Density;
  setDensity: (density: Density) => void;
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
  cycleLuggage: (itemId: string, direction: 1 | -1) => void;
  getNextLuggageHint: (itemId: string, direction: 1 | -1) => string;
  activePresetId: string;
  trips: TripMeta[];
  activeTrip: TripMeta;
  switchTrip: (id: string) => void;
  createTripFromPreset: (presetId: string, role: 'crew' | 'captain') => void;
  createEmptyTrip: () => void;
  renameTrip: (id: string, name: string) => void;
  deleteTrip: (id: string) => void;
  openSharedTrip: (shared: SharedPayload, token: string) => void;
  exportActiveTripAsPreset: () => { fileName: string; yaml: string };
  resetAll: () => void;
  handleCreateItem: (categoryId: string) => void;
  addItem: (categoryId: string, name: string) => string;
  addLooseItem: (name: string) => string;
  handleAddSubItem: (parentId: string, name?: string) => void;
  updateItem: (id: string, updates: Partial<PackItem>) => void;
  deleteItem: (id: string, parentId?: string) => void;
  moveItemCategory: (itemId: string, newCategoryId: string) => void;
  moveItemBy: (itemId: string, delta: 1 | -1) => void;
  moveCategoryBy: (categoryId: string, delta: 1 | -1) => void;
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
  // category whose name is being edited in its header
  renamingCategoryId: string | null;
  setRenamingCategoryId: (id: string | null) => void;
  // category whose actions menu (pack all, bag, priority, delete…) is open
  categoryMenuId: string | null;
  setCategoryMenuId: (id: string | null) => void;
  showPriorities: boolean;
  setShowPriorities: (show: boolean) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  handleCreateCategory: (title?: string) => void;
  setCategoryLuggage: (categoryId: string, luggageId: string) => void;
  packCategory: (categoryId: string) => void;
  unpackCategoryItemsAction: (categoryId: string) => void;
  deleteLuggage: (id: string) => void;
  reorderLuggage: (id: string, direction: 1 | -1) => void;
  packLuggageItems: (luggageId: string) => void;
  unpackLuggageItems: (luggageId: string) => void;
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
  getSharePayload: () => SharedPayload;
  cruiseDescription: string;
  setCruiseDescription: (desc: string) => void;
}

export type LayoutColumns = 1 | 2 | 3;
export const OTHER_CATEGORY_ID = 'cat_other';
export type Density = 'comfortable' | 'compact';

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

  // Trips: the open trip's list lives in the state below; every trip is saved under its own key
  const [initialTrips] = useState(() => loadInitialTrips(defaultPresetId));
  const [trips, setTrips] = useState<TripMeta[]>(initialTrips.index.trips);
  const [activeTripId, setActiveTripId] = useState<string>(initialTrips.index.activeTripId);
  const activeTrip = trips.find(t => t.id === activeTripId) ?? trips[0];
  const activePresetId = activeTrip?.presetId ?? '';

  const [changes, setChanges] = useState<number>(initialTrips.data.changes);
  
  const [showHeader, setShowHeader] = useState(true);

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

  const [categories, setCategories] = useState<Category[]>(initialTrips.data.categories);
  const [warnings, setWarnings] = useState<Warning[]>(initialTrips.data.warnings);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(initialTrips.data.checkedItems);
  const [luggages, setLuggages] = useState<Luggage[]>(initialTrips.data.luggages);
  const [itemLuggage, setItemLuggage] = useState<Record<string, string>>(initialTrips.data.itemLuggage);

  // The item currently opened in place in the list
  const [selectedItemId, setSelectedItemIdRaw] = useState<string | null>(null);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [categoryMenuId, setCategoryMenuId] = useState<string | null>(null);
  const [showPriorities, setShowPriorities] = useState<boolean>(() => localStorage.getItem('sailingPacklist_priorities') !== 'hidden');
  useEffect(() => { localStorage.setItem('sailingPacklist_priorities', showPriorities ? 'shown' : 'hidden'); }, [showPriorities]);
  const [selectedLuggageId, setSelectedLuggageId] = useState<string | null>(null);
  const [newLuggageName, setNewLuggageName] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sailingPacklist_collapsed_v16');
    return saved ? JSON.parse(saved) : {};
  });
  const [swipeHintItemId, setSwipeHintItemId] = useState<string | null>(null);
  const [layoutColumns, setLayoutColumns] = useState<LayoutColumns>(() => {
    const saved = Number(localStorage.getItem('sailingPacklist_columns'));
    return saved === 1 || saved === 3 ? saved : 2;
  });
  const [density, setDensity] = useState<Density>(() =>
    localStorage.getItem('sailingPacklist_density') === 'compact' ? 'compact' : 'comfortable'
  );
  useEffect(() => { localStorage.setItem('sailingPacklist_columns', String(layoutColumns)); }, [layoutColumns]);
  useEffect(() => { localStorage.setItem('sailingPacklist_density', density); }, [density]);
  const [filter, setFilter] = useState<'all' | 'must-have' | 'should-have' | 'nice-to-have'>('all');
  const [itemViewFilter, setItemViewFilter] = useState<ItemViewFilter>('all');
  const [activeMenu, setActiveMenu] = useState<'main' | 'settings' | 'baggage'>('main');
  const [cruiseDescription, setCruiseDescription] = useState<string>(initialTrips.data.description);

  // Save the open trip whenever any part of it changes, and the trip list when it changes
  useEffect(() => {
    saveTripData(activeTripId, { categories, warnings, checkedItems, luggages, itemLuggage, changes, description: cruiseDescription });
  }, [activeTripId, categories, warnings, checkedItems, luggages, itemLuggage, changes, cruiseDescription]);
  useEffect(() => {
    saveTripIndex({ activeTripId, trips });
  }, [activeTripId, trips]);

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
    if (isDragActive()) {
      // a long-press drag (e.g. of a category header) is not a menu swipe
      setMenuTouchStart(null);
      setMenuSwipeOffset(0);
      return;
    }
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

  // Text edits come one keystroke at a time; they're grouped into one undo step per field being edited.
  // Any other action (or editing another field) starts a new step.
  const editSessionRef = useRef<string | null>(null);

  const commitAction = useCallback((message: string) => {
    editSessionRef.current = null;
    const snapshot: AppSnapshot = { changes, categories, warnings, checkedItems, luggages, itemLuggage };
    setPast(prev => [...prev.slice(-29), { id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, message, timestamp: Date.now(), snapshot }]);
    setFuture([]);
  }, [changes, categories, warnings, checkedItems, luggages, itemLuggage]);

  const commitEdit = (sessionKey: string, message: string) => {
    if (editSessionRef.current === sessionKey) return;
    commitAction(message);
    editSessionRef.current = sessionKey;
  };

  const redo = useCallback(() => {
    if (future.length === 0) return;
    editSessionRef.current = null;
    playPopSound('click');
    const next = future[0];
    const currentSnapshot: AppSnapshot = { changes, categories, warnings, checkedItems, luggages, itemLuggage };
    setPast(prev => [...prev, { id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, message: next.message, timestamp: Date.now(), snapshot: currentSnapshot }]);
    setChanges(next.snapshot.changes);
    setCategories(next.snapshot.categories);
    setWarnings(next.snapshot.warnings);
    setCheckedItems(next.snapshot.checkedItems);
    setLuggages(next.snapshot.luggages);
    setItemLuggage(next.snapshot.itemLuggage);
    setFuture(prev => prev.slice(1));
  }, [future, changes, categories, warnings, checkedItems, luggages, itemLuggage]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    editSessionRef.current = null;
    playPopSound('click');
    const last = past[past.length - 1];
    const currentSnapshot: AppSnapshot = { changes, categories, warnings, checkedItems, luggages, itemLuggage };
    setFuture(prev => [{ id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, message: last.message, timestamp: Date.now(), snapshot: currentSnapshot }, ...prev]);
    setChanges(last.snapshot.changes);
    setCategories(last.snapshot.categories);
    setWarnings(last.snapshot.warnings);
    setCheckedItems(last.snapshot.checkedItems);
    setLuggages(last.snapshot.luggages);
    setItemLuggage(last.snapshot.itemLuggage);
    setPast(prev => prev.slice(0, -1));
  }, [past, changes, categories, warnings, checkedItems, luggages, itemLuggage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // inside a text field, Ctrl+Z undoes the typing, not the list
      const el = e.target as HTMLElement;
      if (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => { localStorage.setItem('sailingPacklist_collapsed_v16', JSON.stringify(collapsedCats)); }, [collapsedCats]);
  // Hiding items was removed; drop any leftover hidden state so those items show up again.
  useEffect(() => { localStorage.removeItem('sailingPacklist_hidden_v16'); }, []);

  const setCatCollapsed = useCallback((catId: string, collapsed: boolean) =>
    setCollapsedCats(prev => ({ ...prev, [catId]: collapsed })), []);

  const markSwipeLearned = () => {
    localStorage.setItem('sailingPacklist_swipe_learned', '1');
    setSwipeHintItemId(null);
  };

  const updateChanges = (newVal: number) => {
    commitAction(`Changed showers to ${newVal}`);
    setChanges(newVal);
  };

  // Names of the open item (and its sub-items) as they were when it was opened
  const namesAtOpenRef = useRef<Map<string, string>>(new Map());

  // Closing an item never deletes it by surprise: a name that was cleared gets its old name back.
  // Only something that never had a name (nothing to go back to) is dropped.
  const setSelectedItemId = (id: string | null) => {
    const closing = selectedItemId;
    if (closing && closing !== id) {
      const namesAtOpen = namesAtOpenRef.current;
      const fix = (item: PackItem): PackItem | null => {
        if (item.name.trim()) return item;
        const before = namesAtOpen.get(item.id);
        return before?.trim() ? { ...item, name: before } : null;
      };
      setCategories(prev => {
        let changed = false;
        const next = prev.map(cat => ({
          ...cat,
          items: cat.items.flatMap(item => {
            let result: PackItem | null = item;
            if (item.id === closing) result = fix(item);
            if (result && result.subItems && (item.id === closing || result.subItems.some(sub => sub.id === closing))) {
              const subItems = result.subItems.map(sub => (item.id === closing || sub.id === closing ? fix(sub) : sub)).filter((sub): sub is PackItem => !!sub);
              if (subItems.length !== result.subItems.length || subItems.some((sub, i) => sub !== result!.subItems![i])) result = { ...result, subItems };
            }
            if (result !== item) changed = true;
            return result ? [result] : [];
          }),
        }));
        return changed ? next : prev;
      });
    }
    if (id && id !== closing) {
      const opened = findItemDeep(id);
      namesAtOpenRef.current = new Map(opened ? [[opened.id, opened.name], ...(opened.subItems ?? []).map(sub => [sub.id, sub.name] as [string, string])] : []);
    }
    setSelectedItemIdRaw(id);
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
    navigator.vibrate?.(10);
    
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
    navigator.vibrate?.(10);

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
    if (nextVirt === 0 || !luggages[nextVirt - 1]) return 'Take out of bag';
    return `Put in ${luggages[nextVirt - 1].name}`;
  };

  // Put a trip's list on screen. Undo history belongs to the list it was made in, so it starts fresh.
  const showTripData = (data: TripData) => {
    setCategories(data.categories);
    setWarnings(data.warnings);
    setCheckedItems(data.checkedItems);
    setLuggages(data.luggages);
    setItemLuggage(data.itemLuggage);
    setChanges(data.changes);
    setCruiseDescription(data.description);
    setPast([]);
    setFuture([]);
    setSelectedItemIdRaw(null);
    setItemViewFilter('all');
    setActiveMenu('main');
    // a different packlist starts at its top (which also brings the auto-hidden header back)
    window.scrollTo({ top: 0 });
  };

  const switchTrip = (id: string) => {
    const target = trips.find(t => t.id === id);
    if (!target || id === activeTripId) return;
    const data = loadTripData(id)
      ?? (target.presetId ? buildPresetTripData(target.presetId, 'crew') : buildEmptyTripData(defaultPresetId));
    showTripData(data);
    setActiveTripId(id);
  };

  const addTrip = (meta: Omit<TripMeta, 'id' | 'createdAt'>, data: TripData) => {
    const trip: TripMeta = { ...meta, id: newTripId(), createdAt: Date.now() };
    saveTripData(trip.id, data);
    setTrips(prev => [...prev, trip]);
    showTripData(data);
    setActiveTripId(trip.id);
    playPopSound('click');
  };

  const createTripFromPreset = (presetId: string, role: 'crew' | 'captain') => {
    const baseName = PRESETS[presetId]?.name || presetId;
    const name = uniqueTripName(role === 'captain' && !PRESETS[presetId]?.disableRoles ? `${baseName} (captain)` : baseName, trips);
    addTrip({ name, presetId }, buildPresetTripData(presetId, role));
  };

  const createEmptyTrip = () => {
    addTrip({ name: uniqueTripName('New packlist', trips), presetId: null }, buildEmptyTripData(defaultPresetId));
  };

  const renameTrip = (id: string, name: string) => {
    setTrips(prev => prev.map(t => (t.id === id ? { ...t, name } : t)));
  };

  const deleteTrip = (id: string) => {
    const remaining = trips.filter(t => t.id !== id);
    removeTripData(id);
    if (remaining.length === 0) {
      // Never end up without a list: start over from the default preset
      const fresh: TripMeta = { id: newTripId(), name: PRESETS[defaultPresetId]?.name || 'My packlist', presetId: defaultPresetId, createdAt: Date.now() };
      const data = buildPresetTripData(defaultPresetId, 'crew');
      saveTripData(fresh.id, data);
      setTrips([fresh]);
      showTripData(data);
      setActiveTripId(fresh.id);
      return;
    }
    setTrips(remaining);
    if (id === activeTripId) {
      const next = remaining[remaining.length - 1];
      showTripData(loadTripData(next.id) ?? (next.presetId ? buildPresetTripData(next.presetId, 'crew') : buildEmptyTripData(defaultPresetId)));
      setActiveTripId(next.id);
    }
  };

  const exportActiveTripAsPreset = () => tripToPresetYaml(activeTrip, {
    categories, warnings, checkedItems, luggages, itemLuggage, changes, description: cruiseDescription
  });

  const resetAll = () => {
    if (confirm("Reset everything to default?")) {
      setCategories(getPresetCategories(defaultPresetId, 'crew'));
      setWarnings(getPresetData(defaultPresetId).warnings || []);
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
    // An import becomes a trip of its own, so nothing gets overwritten
    addTrip({ name: uniqueTripName(data.name || 'Imported list', trips), presetId: null }, {
      categories: data.categories || [],
      warnings: data.warnings || [],
      checkedItems: data.checkedItems || {},
      luggages: data.luggages || [],
      itemLuggage: data.itemLuggage || {},
      changes: data.changes || 3,
      description: data.description || '',
    });
  };

  const getSharePayload = (): SharedPayload => {
    // Encode relative to the trip's own preset, so its items travel as compact references
    const basePresetId = PRESETS[activePresetId] ? activePresetId : defaultPresetId;
    const defaultData = getPresetData(basePresetId);
    
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
      const isPresent = categories.some((cat: Category) => cat.items.some((item: PackItem) => item.id === itemId));

      if (!isPresent) {
        return -2; // Special value indicating a deleted default item
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
      p: basePresetId,
      d: cruiseDescription || undefined,
      n: activeTrip?.name,
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

  // A shared link opens as a trip of its own; opening the same link again goes back to that trip
  const openSharedTrip = (shared: SharedPayload, token: string) => {
    const existing = trips.find(t => t.sourceToken === token);
    if (existing) {
      switchTrip(existing.id);
      return;
    }
    const basePresetId = PRESETS[shared.p] ? shared.p : defaultPresetId;
    const name = uniqueTripName(shared.n || PRESETS[basePresetId]?.name || 'Shared packlist', trips);
    addTrip({ name, presetId: basePresetId, sourceToken: token }, buildSharedTripData(shared, defaultPresetId));
  };

  const addItem = (categoryId: string, name: string) => {
    commitAction(`Added ${name}`);
    const newId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setCategories(prev => prev.map(cat => (cat.id === categoryId ? { ...cat, items: [...cat.items, { id: newId, name }] } : cat)));
    return newId;
  };

  // Items added without picking a category land in "Other", created on first use at the end (next to that field)
  const addLooseItem = (name: string) => {
    commitAction(`Added ${name}`);
    const newId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setCategories(prev => {
      const item = { id: newId, name };
      if (prev.some(cat => cat.id === OTHER_CATEGORY_ID)) {
        return prev.map(cat => (cat.id === OTHER_CATEGORY_ID ? { ...cat, items: [...cat.items, item] } : cat));
      }
      return [...prev, { id: OTHER_CATEGORY_ID, title: '📦 Other', isCustom: true, items: [item] }];
    });
    return newId;
  };

  const handleCreateItem = (categoryId: string) => {
    commitAction('Created new custom item');
    const newId = `custom_${Date.now()}`;
    setCategories(prev => prev.map(cat => (cat.id === categoryId ? { ...cat, items: [...cat.items, { id: newId, name: '' }] } : cat)));
    setSelectedItemId(newId);
  };

  const handleAddSubItem = (parentId: string, name = '') => {
    commitAction(name ? `Added ${name}` : 'Added new sub-item');
    const newId = `custom_sub_${Date.now()}`;
    setCategories(prev => prev.map(cat => ({
      ...cat,
      items: cat.items.map(item => {
        if (item.id === parentId) {
          return {
            ...item,
            subItems: [...(item.subItems || []), { id: newId, name }]
          };
        }
        return item;
      })
    })));
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const cat = categories.find(c => c.id === id);
    commitEdit(`cat:${id}:${Object.keys(updates).join()}`, `Edited ${cat?.title || 'category'}`);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = (id: string) => {
    playPopSound('pop');
    commitAction(`Deleted ${categories.find(c => c.id === id)?.title || 'category'}`);
    setCategories(prev => prev.filter(c => c.id !== id));
    setCategoryMenuId(null);
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

  const packCategory = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    playPopSound('click');
    commitAction(`Packed all in ${cat.title}`);
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
    const item = findItemDeep(id);
    // remember the name before its first edit, so clearing it and closing brings it back
    if ('name' in updates && item && !namesAtOpenRef.current.has(id)) namesAtOpenRef.current.set(id, item.name);
    const name = item?.name || 'item';
    const message = 'name' in updates ? `Renamed ${name}` : 'description' in updates ? `Edited note of ${name}` : `Edited ${name}`;
    commitEdit(`item:${id}:${Object.keys(updates).join()}`, message);
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

  // One step up or down; at the edge of a category it continues into the neighbouring one
  const moveItemBy = (itemId: string, delta: 1 | -1) => {
    const catIndex = categories.findIndex(c => c.items.some(i => i.id === itemId));
    if (catIndex < 0) return;
    const cat = categories[catIndex];
    const index = cat.items.findIndex(i => i.id === itemId);
    const item = cat.items[index];
    const target = index + delta;

    if (target >= 0 && target < cat.items.length) {
      commitAction(`Moved ${item.name}`);
      setCategories(prev => prev.map(c => {
        if (c.id !== cat.id) return c;
        const items = [...c.items];
        [items[index], items[target]] = [items[target], items[index]];
        return { ...c, items };
      }));
      return;
    }

    const neighbour = categories[catIndex + delta];
    if (!neighbour) return;
    commitAction(`Moved ${item.name} to ${neighbour.title}`);
    setCatCollapsed(neighbour.id, false);
    setCategories(prev => prev.map(c => {
      if (c.id === cat.id) return { ...c, items: c.items.filter(i => i.id !== itemId) };
      // entering from above lands at the top, from below at the bottom
      if (c.id === neighbour.id) return { ...c, items: delta > 0 ? [item, ...c.items] : [...c.items, item] };
      return c;
    }));
  };

  const moveCategoryBy = (categoryId: string, delta: 1 | -1) => {
    const index = categories.findIndex(c => c.id === categoryId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= categories.length) return;
    commitAction(`Moved ${categories[index].title}`);
    setCategories(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
    const lug = luggages.find(l => l.id === id);
    commitEdit(`bag:${id}:${Object.keys(updates).join()}`, `Edited bag ${lug?.name || ''}`.trim());
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

  const packLuggageItems = (luggageId: string) => {
    const lug = luggages.find(l => l.id === luggageId);
    if (!lug) return;
    playPopSound('click');
    commitAction(`Packed bag ${lug.name}`);
    
    const itemsInBag = Object.keys(itemLuggage).filter(itemId => itemLuggage[itemId] === luggageId);
    
    setCheckedItems(prev => {
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
      .filter(i => !checkedItems[i.id])
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
      luggages, setLuggages, itemLuggage, setItemLuggage, selectedItemId, setSelectedItemId,
      renamingCategoryId, setRenamingCategoryId, categoryMenuId, setCategoryMenuId, showPriorities, setShowPriorities,
      selectedLuggageId, setSelectedLuggageId, newLuggageName, setNewLuggageName,
      collapsedCats, setCatCollapsed, swipeHintItemId, setSwipeHintItemId, markSwipeLearned,
      layoutColumns, setLayoutColumns, density, setDensity,
      filter, setFilter, itemViewFilter, setItemViewFilter, activeMenu, setActiveMenu, past, future, undo, redo, commitAction, toggleCheck, toggleParentItem,
      cycleLuggage, getNextLuggageHint, activePresetId, resetAll,
      trips, activeTrip, switchTrip, createTripFromPreset, createEmptyTrip, renameTrip, deleteTrip, openSharedTrip, exportActiveTripAsPreset, handleCreateItem, handleAddSubItem, addItem, addLooseItem,
      updateItem, deleteItem, moveItemCategory, moveItemBy, moveCategoryBy, updateCategory, deleteCategory, handleCreateCategory, setCategoryLuggage, packCategory, unpackCategoryItemsAction, updateLuggage, deleteLuggage, reorderLuggage, packLuggageItems, unpackLuggageItems, handleAddLuggage, getMissingCount, deferredPrompt, handleInstallClick,
      confirmToast, triggerConfirm, activeToastId, showPriorityToast, getSubItemCounts,
      handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd, getMenuStyles,
      particles, triggerParticle, theme, setTheme, importData, getSharePayload,
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
