import { useState } from 'react';
import {
  MouseSensor, TouchSensor, useSensor, useSensors, closestCorners, closestCenter,
  type Active, type CollisionDetection,
  type DragStartEvent, type DragOverEvent, type DragEndEvent, type UniqueIdentifier
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Category } from '../types';

// Droppable id for a whole category card (items can be dropped into empty or collapsed ones)
export const CATEGORY_DROP_PREFIX = 'cat:';
export const categoryDropId = (catId: string) => `${CATEGORY_DROP_PREFIX}${catId}`;

// Sortable id for a category, dragged by its header
const CATEGORY_DRAG_PREFIX = 'catdrag:';
export const categoryDragId = (catId: string) => `${CATEGORY_DRAG_PREFIX}${catId}`;
const catIdFromDragId = (id: UniqueIdentifier) => String(id).slice(CATEGORY_DRAG_PREFIX.length);

// A drag ends with a mouseup that can land on what it started from; clicks use this to ignore that mouseup
let lastDragEndAt = 0;
let dragActive = false;
export const justFinishedDrag = () => Date.now() - lastDragEndAt < 250;
// Other gestures (like the menu swipe) step aside while something is being dragged
export const isDragActive = () => dragActive;

const isCategoryDrag = (active: Active) => active.data.current?.type === 'category';

const findCategoryId = (cats: Category[], id: UniqueIdentifier) => {
  const key = String(id);
  if (key.startsWith(CATEGORY_DROP_PREFIX)) return key.slice(CATEGORY_DROP_PREFIX.length);
  return cats.find(c => c.items.some(i => i.id === key))?.id;
};

const findColumn = (columns: string[][], catId: string) => columns.findIndex(col => col.includes(catId));

const orderSignature = (cats: Category[]) => cats.map(c => `${c.id}:${c.items.map(i => i.id).join(',')}`).join('|');

// Categories only sort among categories, items only among items (and into category cards)
export const listCollisionDetection: CollisionDetection = (args) => {
  const categoryDrag = isCategoryDrag(args.active);
  const droppableContainers = args.droppableContainers.filter(c =>
    String(c.id).startsWith(CATEGORY_DRAG_PREFIX) === categoryDrag
  );
  return categoryDrag
    ? closestCenter({ ...args, droppableContainers })
    : closestCorners({ ...args, droppableContainers });
};

/**
 * Drag & drop for the list: items within and across categories, and whole categories.
 * Drags work on preview copies, so the real list (and undo history) only changes once, on drop.
 */
export const useListDrag = (
  categories: Category[],
  // category ids per column, as currently shown
  categoryColumns: string[][],
  onCommit: (next: Category[], message: string) => void
) => {
  const [preview, setPreview] = useState<Category[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  // While a category is dragged: the column layout, updated live when it moves to another column
  const [columnsPreview, setColumnsPreview] = useState<string[][] | null>(null);

  const sensors = useSensors(
    // Mouse: start after a small move so clicks and checkbox taps still work
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: long-press, so horizontal swipes and scrolling keep working
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
  );

  const reset = () => {
    setPreview(null);
    setActiveId(null);
    setDraggedCategoryId(null);
    setColumnsPreview(null);
    lastDragEndAt = Date.now();
    dragActive = false;
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    dragActive = true;
    navigator.vibrate?.(15);
    if (isCategoryDrag(active)) {
      setDraggedCategoryId(catIdFromDragId(active.id));
      setColumnsPreview(categoryColumns);
      return;
    }
    setActiveId(String(active.id));
    setPreview(categories);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    if (isCategoryDrag(active)) {
      // Within a column the sortable list makes room by itself; across columns we move it over live
      const draggedId = catIdFromDragId(active.id);
      const targetId = catIdFromDragId(over.id);
      setColumnsPreview(prev => {
        if (!prev) return prev;
        const from = findColumn(prev, draggedId);
        const to = findColumn(prev, targetId);
        if (from < 0 || to < 0 || from === to) return prev;
        const next = prev.map(col => col.filter(id => id !== draggedId));
        next[to].splice(next[to].indexOf(targetId), 0, draggedId);
        return next;
      });
      return;
    }

    // Moving an item into another category happens live, so the list opens a gap where it will land
    setPreview(prev => {
      if (!prev) return prev;
      const fromId = findCategoryId(prev, active.id);
      const toId = findCategoryId(prev, over.id);
      if (!fromId || !toId || fromId === toId) return prev;

      const fromCat = prev.find(c => c.id === fromId)!;
      const toCat = prev.find(c => c.id === toId)!;
      const item = fromCat.items.find(i => i.id === active.id);
      if (!item) return prev;

      const overIndex = toCat.items.findIndex(i => i.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : toCat.items.length;

      return prev.map(c => {
        if (c.id === fromId) return { ...c, items: c.items.filter(i => i.id !== item.id) };
        if (c.id === toId) return { ...c, items: [...c.items.slice(0, insertAt), item, ...c.items.slice(insertAt)] };
        return c;
      });
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (isCategoryDrag(active)) {
      const draggedId = catIdFromDragId(active.id);
      if (over && columnsPreview) {
        const targetId = catIdFromDragId(over.id);
        const columns = columnsPreview.map(col => [...col]);
        const colIndex = findColumn(columns, draggedId);
        if (colIndex >= 0 && colIndex === findColumn(columns, targetId)) {
          const col = columns[colIndex];
          columns[colIndex] = arrayMove(col, col.indexOf(draggedId), col.indexOf(targetId));
        }
        // The new order reads like the page: first column top to bottom, then the next
        const order = columns.flat();
        if (order.join() !== categories.map(c => c.id).join()) {
          const byId = new Map(categories.map(c => [c.id, c]));
          onCommit(order.map(id => byId.get(id)!), `Moved ${byId.get(draggedId)?.title || 'category'}`);
        }
      }
      reset();
      return;
    }

    let next = preview;
    if (next && over) {
      const catId = findCategoryId(next, active.id);
      const overIsItem = !String(over.id).startsWith(CATEGORY_DROP_PREFIX);
      if (catId && overIsItem && catId === findCategoryId(next, over.id)) {
        next = next.map(c => {
          if (c.id !== catId) return c;
          const from = c.items.findIndex(i => i.id === active.id);
          const to = c.items.findIndex(i => i.id === over.id);
          return from === to ? c : { ...c, items: arrayMove(c.items, from, to) };
        });
      }
    }
    if (next && over && orderSignature(next) !== orderSignature(categories)) {
      const name = next.flatMap(c => c.items).find(i => i.id === active.id)?.name || 'item';
      onCommit(next, `Moved ${name}`);
    }
    reset();
  };

  return {
    sensors,
    activeId,
    draggedCategoryId,
    columnsPreview,
    shownCategories: preview ?? categories,
    handlers: { onDragStart, onDragOver, onDragEnd, onDragCancel: reset },
  };
};
