import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import type { Category, PackItem } from '../../types';
import { ItemRow } from './ItemRow';
import { AddItemInput } from './AddItemInput';
import { CategoryMenu, PriorityPicker } from './CategoryMenu';
import { PRIORITIES } from '../../utils/priorities';
import { countLeafItems } from '../../utils/countUtils';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { categoryDropId, categoryDragId, justFinishedDrag } from '../../hooks/useListDrag';

const priorityLabel = (priority: string) => {
  const text = priority.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

interface CategoryBlockProps {
  cat: Category;
  dragEnabled?: boolean;
}

export const CategoryBlock: React.FC<CategoryBlockProps> = ({ cat, dragEnabled = false }) => {
  const {
    filter, addItem, updateCategory,
    renamingCategoryId, setRenamingCategoryId, categoryMenuId, setCategoryMenuId, showPriorities,
    changes, luggages, itemLuggage, itemViewFilter, checkedItems,
    collapsedCats, setCatCollapsed, selectedItemId
  } = usePacklist();

  const { total: catTotal, packed: catPacked } = countLeafItems(cat.items, checkedItems);
  const isDone = catTotal > 0 && catPacked === catTotal;
  const isCollapsed = !!collapsedCats[cat.id];
  const isRenaming = renamingCategoryId === cat.id;
  const headerRef = useRef<HTMLDivElement | null>(null);
  // where the priority picker / actions menu hang from
  const [priorityAnchor, setPriorityAnchor] = useState<DOMRect | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  // the menu can be opened from elsewhere (keyboard, long-press): measure the header when it does
  useLayoutEffect(() => {
    setMenuAnchor(categoryMenuId === cat.id ? headerRef.current?.getBoundingClientRect() ?? null : null);
  }, [categoryMenuId, cat.id]);
  const [titleAtRename, setTitleAtRename] = useState(cat.title);
  const [wasRenaming, setWasRenaming] = useState(isRenaming);
  if (wasRenaming !== isRenaming) {
    setWasRenaming(isRenaming);
    if (isRenaming) setTitleAtRename(cat.title);
  }
  const finishRename = (revert = false) => {
    if (revert || !cat.title.trim()) updateCategory(cat.id, { title: titleAtRename });
    setRenamingCategoryId(null);
    requestAnimationFrame(() => headerRef.current?.focus());
  };

  // The whole card accepts drops, so items can go into empty or collapsed categories
  const { setNodeRef: setDropRef, isOver, active } = useDroppable({ id: categoryDropId(cat.id), disabled: !dragEnabled });
  // The header is the handle for moving the whole category. It is also what gets measured, so the
  // drag works with header-sized boxes; the movement (making room for the dragged one) applies to the card.
  const {
    setNodeRef: setDragRef, listeners: dragListeners, transform, transition, isDragging: isCategoryDragged
  } = useSortable({
    id: categoryDragId(cat.id),
    data: { type: 'category', catId: cat.id },
    disabled: !dragEnabled,
  });
  const isItemOver = isOver && active?.data.current?.type !== 'category';

  // Fold the category away shortly after its last item gets packed, and open it again if it gets unpacked
  const prevDone = useRef(isDone);
  useEffect(() => {
    if (prevDone.current === isDone) return;
    prevDone.current = isDone;
    const t = setTimeout(() => setCatCollapsed(cat.id, isDone), isDone ? 700 : 0);
    return () => clearTimeout(t);
  }, [isDone, cat.id, setCatCollapsed]);

  // Opening an item that sits in a collapsed category (new item, bag list) unfolds the category
  const holdsSelected = !!selectedItemId && cat.items.some(i => i.id === selectedItemId || i.subItems?.some(s => s.id === selectedItemId));
  useEffect(() => {
    if (holdsSelected && isCollapsed) setCatCollapsed(cat.id, false);
  }, [holdsSelected, isCollapsed, cat.id, setCatCollapsed]);

  if (filter !== 'all' && cat.priority !== filter) return null;

  const itemsToRender: { item: PackItem, isSubItem: boolean, parentId?: string, parentName?: string }[] = [];

  cat.items.forEach(item => {
    if (itemViewFilter === 'all') {
      itemsToRender.push({ item, isSubItem: false });
    } else { // 'packed' or 'unpacked'
      if (item.subItems && item.subItems.length > 0) {
        // Unroll sub-items when a filter is active
        item.subItems.forEach(subItem => {
          const isSubItemPacked = !!checkedItems[subItem.id];
          const subItemMatchesFilter =
            (itemViewFilter === 'packed' && isSubItemPacked) ||
            (itemViewFilter === 'unpacked' && !isSubItemPacked);

          if (subItemMatchesFilter) {
            itemsToRender.push({ item: subItem, isSubItem: true, parentId: item.id, parentName: item.name });
          }
        });
      } else { // Regular item (no sub-items)
        const isPacked = !!checkedItems[item.id];
        const regularItemMatchesFilter =
          (itemViewFilter === 'packed' && isPacked) ||
          (itemViewFilter === 'unpacked' && !isPacked);

        if (regularItemMatchesFilter) {
          itemsToRender.push({ item, isSubItem: false });
        }
      }
    }
  });

  const baseSetQty = changes;
  const isCustomCategory = cat.id.startsWith('cat_custom_') || (cat as any).isCustom;

  if (cat.items.length === 0 && !isCustomCategory) return null; // Only hide completely empty preset categories

  // Hide the category entirely if we're filtering and there are no matching items
  if (itemViewFilter !== 'all' && itemsToRender.length === 0) return null;

  const toggleCollapsed = () => setCatCollapsed(cat.id, !isCollapsed);

  return (
    <div
      ref={setDropRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`category-block ${isCollapsed ? 'is-collapsed' : ''} ${isItemOver ? 'is-drop-target' : ''} ${isCategoryDragged ? 'is-drag-source' : ''}`}
    >
      <div
        ref={(el) => { setDragRef(el); headerRef.current = el; }}
        data-category-header={cat.id}
        data-nav="category"
        data-cat-id={cat.id}
        tabIndex={-1}
        className={`category-header ${isDone ? 'done' : ''}`}
        {...dragListeners}
        onClick={(e) => {
          if (justFinishedDrag() || isRenaming) return;
          if (!(e.target as HTMLElement).closest('button, h3, input, .stars-badge')) toggleCollapsed();
        }}
        // the actions menu: right-click here, long-press on touch, "m" on the keyboard
        onContextMenu={(e) => { e.preventDefault(); setCategoryMenuId(cat.id); }}
      >
        <div className="category-title-area">
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            {isRenaming ? (
              <input
                className="category-title-input"
                autoFocus
                value={cat.title}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateCategory(cat.id, { title: e.target.value })}
                onBlur={() => finishRename()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') finishRename();
                  if (e.key === 'Escape') finishRename(true);
                }}
                placeholder={titleAtRename || 'Category name'}
                aria-label="Category name"
              />
            ) : (
              <h3 onClick={() => { if (!justFinishedDrag()) setRenamingCategoryId(cat.id); }} style={{ cursor: 'text' }} title="Rename · right-click for more" data-shortcut="e">{cat.title}</h3>
            )}
          </div>
          <div className="category-meta">
            {catTotal > 0 && <span className="cat-progress">{isDone ? '✓ ' : ''}{catPacked}/{catTotal}</span>}
            {showPriorities && (
              <button
                className={`stars-badge ${cat.priority ? '' : 'is-empty'}`}
                title={cat.priority ? `${priorityLabel(cat.priority)} · click to change` : 'Set a priority'}
                onClick={(e) => setPriorityAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())}
              >
                {PRIORITIES.find(p => p.value === cat.priority)?.stars ?? '☆☆☆'}
              </button>
            )}
            <button
              className="btn-collapse-cat"
              onClick={toggleCollapsed}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? 'Unfold' : 'Fold'}
              data-shortcut="c"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {priorityAnchor && <PriorityPicker cat={cat} anchor={priorityAnchor} onClose={() => setPriorityAnchor(null)} />}
      {menuAnchor && (
        <CategoryMenu cat={cat} anchor={menuAnchor} onClose={() => setCategoryMenuId(null)} onRename={() => setRenamingCategoryId(cat.id)} />
      )}
      {catTotal > 0 && (
        <div className="cat-progress-bar" aria-hidden="true">
          <div className={`cat-progress-fill ${isDone ? 'done' : ''}`} style={{ width: `${(catPacked / catTotal) * 100}%` }} />
        </div>
      )}
      <div className="category-body">
        <div className="category-body-inner">
          <SortableContext items={itemsToRender.map(({ item }) => item.id)} strategy={verticalListSortingStrategy}>
          <ul>
            {itemsToRender.map(({ item, isSubItem, parentId, parentName }) => {
              const isBaseItem = item.id.startsWith('base_') && (item.id.includes('underwear') || item.id.includes('socks') || item.id.includes('tshirt'));
              const displayQty = isBaseItem ? baseSetQty : item.qty;
              const assignedLuggage = luggages.find(l => l.id === itemLuggage[item.id]);

              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  displayQty={displayQty}
                  assignedLuggage={assignedLuggage}
                  isSubItem={isSubItem}
                  parentId={parentId}
                  parentName={parentName}
                  dragEnabled={dragEnabled && !isSubItem}
                />
              );
            })}
            {itemViewFilter === 'all' && (
              <li className="add-item-row">
                <AddItemInput
                  placeholder="Add item"
                  onAdd={(name) => addItem(cat.id, name)}
                  dataAttrs={{ 'data-add-item-for': cat.id, 'data-shortcut': 'n' }}
                />
              </li>
            )}
          </ul>
          </SortableContext>
        </div>
      </div>
    </div>
  );
};
