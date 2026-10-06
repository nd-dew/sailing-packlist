import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { PacklistProvider, usePacklist } from './context/PacklistContext';
import { Header } from './components/layout/Header';
import { SettingsMenu } from './components/layout/SettingsMenu';
import { BaggageMenu } from './components/layout/BaggageMenu';
import { TripHeader } from './components/layout/TripHeader';
import { CategoryBlock } from './components/core/CategoryBlock';
import { BagModal } from './components/modals/BagModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { decompressPayload } from './utils/shareUtils';
import { PRESETS } from './utils/presetUtils';
import { countLeafItems } from './utils/countUtils';
import { getPresetIdFromPath, replacePresetPath, clearUrlHash } from './utils/urlUtils';
import { useListDrag, listCollisionDetection, categoryDragId } from './hooks/useListDrag';
import { DndContext, DragOverlay, MeasuringStrategy, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ItemDragPreview } from './components/core/ItemDragPreview';
import { HoverTooltips } from './components/core/HoverTooltips';
import { AddItemInput } from './components/core/AddItemInput';
import { ShortcutsHelp } from './components/core/ShortcutsHelp';
import { useListKeyboard } from './hooks/useListKeyboard';
import type { Category } from './types';
import './App.css';

// Split categories into N columns with similar height, keeping list order
// (first column top to bottom, then the next) so reading order matches mobile
const splitIntoColumns = (cats: Category[], columns: number): Category[][] => {
  const weights = cats.map(cat => cat.items.length + 3); // item count + header padding
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const result: Category[][] = Array.from({ length: columns }, () => []);
  let before = 0;
  cats.forEach((cat, i) => {
    // place each category in the column its vertical midpoint falls into
    const col = Math.min(columns - 1, Math.floor(((before + weights[i] / 2) / total) * columns));
    result[col].push(cat);
    before += weights[i];
  });
  return result;
};

// How many columns actually fit: phones get one, mid-size screens at most two
const useEffectiveColumns = (preferred: number) => {
  const query = () => (window.innerWidth <= 850 ? 1 : window.innerWidth < 1100 ? Math.min(preferred, 2) : preferred);
  const [cols, setCols] = React.useState(query);
  useEffect(() => {
    const update = () => setCols(query());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferred]);
  return cols;
};

// The URL is read once per page load (React dev mode runs mount effects twice; this must not create two trips)
let urlHandled = false;

const AppContent: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, confirmToast, categories, itemViewFilter,
    handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd,
    handleCreateCategory, triggerConfirm,
    checkedItems, collapsedCats, setSwipeHintItemId,
    activePresetId, layoutColumns, density, commitAction, setCategories, luggages, itemLuggage, changes,
    trips, activeTrip, switchTrip, createTripFromPreset, openSharedTrip, addLooseItem
  } = usePacklist();

  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const toggleShortcuts = React.useCallback(() => setShowShortcuts(open => !open), []);
  useListKeyboard(toggleShortcuts);

  // What the page was opened with, captured before the effect below rewrites the address bar.
  // `linkedPresetId` is a preset link (path or old #p=) to a preset other than the open trip's.
  const [openedWith] = React.useState(() => {
    const hash = window.location.hash;
    const presetId = hash.startsWith('#p=') ? hash.substring(3) : hash.startsWith('#s=') ? null : getPresetIdFromPath();
    const linkedPresetId = presetId && PRESETS[presetId] && presetId !== activePresetId ? presetId : null;
    return { hash, linkedPresetId };
  });
  const linkedExistingTrip = openedWith.linkedPresetId
    ? [...trips].reverse().find(t => t.presetId === openedWith.linkedPresetId)
    : undefined;

  // A link to a preset with separate crew/captain lists (and no trip from it yet): ask which one
  const [rolePromptPresetId, setRolePromptPresetId] = React.useState<string | null>(() => {
    const id = openedWith.linkedPresetId;
    return id && !linkedExistingTrip && !PRESETS[id].disableRoles ? id : null;
  });

  // Keep the address bar on the open trip's preset (plain base path for trips without one)
  useEffect(() => {
    if (!rolePromptPresetId) replacePresetPath(activePresetId);
  }, [activePresetId, rolePromptPresetId]);

  useEffect(() => {
    document.title = activeTrip?.name ? `${activeTrip.name} · BSC Packing List` : 'BSC Packing List';
  }, [activeTrip?.name]);

  // Wider page for 3 columns, narrower for 1 (the fixed header follows the same width)
  useEffect(() => {
    const width = layoutColumns === 3 ? '1400px' : layoutColumns === 1 ? '720px' : '1000px';
    document.documentElement.style.setProperty('--app-max-width', width);
  }, [layoutColumns]);

  // Links never overwrite your list: a preset link opens your trip from that preset (or starts one),
  // a shared link opens as a trip of its own
  useEffect(() => {
    if (urlHandled) return;
    urlHandled = true;
    const { hash, linkedPresetId } = openedWith;

    if (hash.startsWith('#s=')) {
      const token = hash.substring(3);
      clearUrlHash();
      decompressPayload(token)
        .then(shared => {
          openSharedTrip(shared, token);
          triggerConfirm('⛵ Opened the shared packlist as a new one', '', () => {});
        })
        .catch(err => {
          console.error("Failed to parse shared URL:", err);
          alert("Failed to parse shared URL. The link might be invalid or broken.");
        });
      return;
    }

    if (hash.startsWith('#p=')) clearUrlHash();
    if (!linkedPresetId || rolePromptPresetId) return;
    if (linkedExistingTrip) switchTrip(linkedExistingTrip.id);
    else createTripFromPreset(linkedPresetId, 'crew');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPresetTrip = (role: 'crew' | 'captain') => {
    if (rolePromptPresetId) createTripFromPreset(rolePromptPresetId, role);
    setRolePromptPresetId(null);
  };

  const effectiveColumns = useEffectiveColumns(layoutColumns);
  // Columns are decided from the real list, so item drags don't make categories jump between columns
  const columnIds = splitIntoColumns(categories, effectiveColumns).map(col => col.map(cat => cat.id));
  const drag = useListDrag(categories, columnIds, (next, message) => {
    commitAction(message);
    setCategories(next);
  });
  const dragEnabled = itemViewFilter === 'all';

  // During a category drag the columns follow the drag preview
  const shownById = new Map(drag.shownCategories.map(cat => [cat.id, cat]));
  const columns = (drag.columnsPreview ?? columnIds).map(col => col.map(id => shownById.get(id)!).filter(Boolean));
  // "Add Category" goes under the last column that has categories (the first one on an empty trip)
  const addCategoryColumn = Math.max(0, columns.map(col => col.length > 0).lastIndexOf(true));
  const draggedCategory = drag.draggedCategoryId ? categories.find(c => c.id === drag.draggedCategoryId) : undefined;
  // Reordering categories folds every card to its header, which moves the grabbed header away from the
  // pointer. Put it back under the pointer: keep the page as tall as before (so it can't shrink and jump
  // the scroll), scroll by the difference, and where scrolling can't go far enough, push the list down.
  const gridRef = useRef<HTMLDivElement>(null);
  const grabTopRef = useRef<number | null>(null);
  const categoryHeader = (catId: string) => document.querySelector(`[data-category-header="${catId}"]`);
  const handleDragStart = (event: DragStartEvent) => {
    const catId = event.active.data.current?.type === 'category' ? event.active.data.current.catId : null;
    if (catId && gridRef.current) {
      // measured now, before anything folds
      grabTopRef.current = categoryHeader(catId)?.getBoundingClientRect().top ?? null;
      gridRef.current.style.minHeight = `${gridRef.current.offsetHeight}px`;
    }
    drag.handlers.onDragStart(event);
  };
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!drag.draggedCategoryId) {
      grid.style.minHeight = '';
      grid.style.paddingTop = '';
      return;
    }
    const header = categoryHeader(drag.draggedCategoryId);
    const grabTop = grabTopRef.current;
    if (!header || grabTop === null) return;
    window.scrollBy(0, header.getBoundingClientRect().top - grabTop);
    const stillAbove = grabTop - header.getBoundingClientRect().top;
    if (stillAbove > 0) grid.style.paddingTop = `${stillAbove}px`;
  }, [drag.draggedCategoryId]);

  const draggedItem = drag.activeId ? drag.shownCategories.flatMap(c => c.items).find(i => i.id === drag.activeId) : undefined;

  const { total: totalItems, packed: packedItems } = countLeafItems(categories.flatMap(cat => cat.items), checkedItems);
  const allPacked = totalItems > 0 && packedItems === totalItems;

  // On touch devices, demo the swipe gestures on the first item until the user has swiped once
  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    if (localStorage.getItem('sailingPacklist_swipe_learned')) return;
    const firstItem = categories
      .filter(cat => !collapsedCats[cat.id])
      .flatMap(cat => cat.items)[0];
    if (!firstItem) return;
    const t = setTimeout(() => setSwipeHintItemId(firstItem.id), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={`filter-glow-frame ${itemViewFilter === 'packed' ? 'packed' : itemViewFilter === 'unpacked' ? 'unpacked' : ''}`} />
      <div 
        className={`app-container density-${density}`} 
        onTouchStart={handleGlobalTouchStart} 
        onTouchMove={handleGlobalTouchMove} 
        onTouchEnd={handleGlobalTouchEnd}
      >
      <Header />
      <HoverTooltips />
      
      {activeMenu !== 'main' && <div className="menu-overlay" onClick={() => setActiveMenu('main')} />}

      {confirmToast && (
        <div className="confirm-toast-overlay">
          <div className="confirm-toast">
            {confirmToast.message}
          </div>
        </div>
      )}

      {rolePromptPresetId && (
        <div className="share-confirm-overlay" onClick={() => setRolePromptPresetId(null)}>
          <div className="share-confirm-card role-card" onClick={(e) => e.stopPropagation()}>
            <h3>{PRESETS[rolePromptPresetId]?.name}</h3>
            <p>Which packing list do you need?</p>
            <div className="share-confirm-actions">
              <button onClick={() => startPresetTrip('crew')} className="btn-share-confirm confirm">Crew</button>
              <button onClick={() => startPresetTrip('captain')} className="btn-share-confirm confirm">Captain</button>
            </div>
            <button onClick={() => setRolePromptPresetId(null)} className="btn-role-skip">Not now</button>
          </div>
        </div>
      )}

      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}

      <SettingsMenu />
      <BaggageMenu />

      <BagModal />
      <CategoryModal />

      <TripHeader />
      <AddItemInput
        className="quick-add"
        placeholder="Add an item (no category needed)"
        onAdd={(name) => addLooseItem(name)}
        dataAttrs={{ 'data-quick-add': '' }}
      />

      {allPacked && (
        <div className="all-packed-banner" role="status">
          <span className="all-packed-icon">⛵</span>
          <div>
            <strong>All packed!</strong>
            <span>Ready to sail.</span>
          </div>
        </div>
      )}

      <DndContext
        sensors={drag.sensors}
        collisionDetection={listCollisionDetection}
        // categories fold up when a category drag starts, so drop targets must be re-measured as they move
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        {...drag.handlers}
        onDragStart={handleDragStart}
      >
        <div
          ref={gridRef}
          className={`checklist-grid cols-${effectiveColumns} ${drag.activeId || draggedCategory ? 'is-dragging' : ''} ${draggedCategory ? 'is-reordering-categories' : ''}`}>
          {columns.map((col, colIndex) => (
            <div className="checklist-column" key={colIndex}>
              <SortableContext items={col.map(cat => categoryDragId(cat.id))} strategy={verticalListSortingStrategy}>
                {col.map(cat => (
                  <CategoryBlock key={cat.id} cat={cat} dragEnabled={dragEnabled} />
                ))}
              </SortableContext>
              {colIndex === addCategoryColumn && (
                <div className="category-block btn-add-category-block" onClick={() => handleCreateCategory()}>
                  <div className="category-header add-category-header">
                    <div className="category-title-area add-category-title-area">
                      <h3>Add Category</h3>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          {draggedCategory && (
            <div className="category-block category-drag-overlay">
              <div className="category-header">
                <div className="category-title-area">
                  <h3>{draggedCategory.title}</h3>
                </div>
              </div>
            </div>
          )}
          {draggedItem && (
            <ItemDragPreview
              item={draggedItem}
              checked={!!checkedItems[draggedItem.id]}
              qty={draggedItem.id.startsWith('base_') && /underwear|socks|tshirt/.test(draggedItem.id) ? changes : draggedItem.qty}
              luggage={luggages.find(l => l.id === itemLuggage[draggedItem.id])}
            />
          )}
        </DragOverlay>
      </DndContext>

      <footer className="app-footer">
        <button className="btn-shortcuts desktop-only" onClick={toggleShortcuts} title="Keyboard shortcuts (?)">⌨ Shortcuts</button>
        <span className="footer-sep desktop-only">|</span>
        <a href="https://www.sailingcommunity.be/" target="_blank" rel="noopener noreferrer">
          <img src={`${import.meta.env.BASE_URL}bsc.ico`} alt="BSC" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Belgian Sailing Community
        </a>
        <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
        <a href="https://github.com/nd-dew/sailing-packlist" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'normal', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </footer>
    </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <PacklistProvider>
      <AppContent />
    </PacklistProvider>
  );
};

export default App;
