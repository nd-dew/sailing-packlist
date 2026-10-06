import { useState } from 'react';
import {
  MouseSensor, TouchSensor, useSensor, useSensors, closestCorners, closestCenter, pointerWithin,
  type Active, type Over, type CollisionDetection,
  type DragStartEvent, type DragOverEvent, type DragMoveEvent, type DragEndEvent, type UniqueIdentifier
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Category } from '../types';

// Droppable id for a whole category (items can be dropped into empty or collapsed ones; categories drop next to it)
export const CATEGORY_DROP_PREFIX = 'cat:';
export const categoryDropId = (catId: string) => `${CATEGORY_DROP_PREFIX}${catId}`;
// Draggable id for a category, dragged by its header
export const categoryDragId = (catId: string) => `catdrag:${catId}`;

export type CategoryDropPosition = 'before' | 'after';

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

const orderSignature = (cats: Category[]) => cats.map(c => `${c.id}:${c.items.map(i => i.id).join(',')}`).join('|');

// Categories only land next to other categories; items use the usual sortable behaviour
export const listCollisionDetection: CollisionDetection = (args) => {
  if (!isCategoryDrag(args.active)) return closestCorners(args);
  const droppableContainers = args.droppableContainers.filter(c => String(c.id).startsWith(CATEGORY_DROP_PREFIX));
  const hits = pointerWithin({ ...args, droppableContainers });
  return hits.length ? hits : closestCenter({ ...args, droppableContainers });
};

const dropPosition = (active: Active, over: Over): CategoryDropPosition => {
  const dragged = active.rect.current.translated;
  if (!dragged) return 'after';
  const draggedCenter = dragged.top + dragged.height / 2;
  return draggedCenter < over.rect.top + over.rect.height / 2 ? 'before' : 'after';
};

const moveCategory = (cats: Category[], draggedId: string, targetId: string, position: CategoryDropPosition) => {
  const dragged = cats.find(c => c.id === draggedId);
  if (!dragged || draggedId === targetId) return cats;
  const rest = cats.filter(c => c.id !== draggedId);
  const index = rest.findIndex(c => c.id === targetId) + (position === 'after' ? 1 : 0);
  return [...rest.slice(0, index), dragged, ...rest.slice(index)];
};

/**
 * Drag & drop for the list: items within and across categories, and whole categories.
 * Item drags work on a preview copy so the real list (and undo history) only changes once, on drop.
 */
export const useListDrag = (
  categories: Category[],
  onCommit: (next: Category[], message: string) => void
) => {
  const [preview, setPreview] = useState<Category[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [categoryDrop, setCategoryDrop] = useState<{ catId: string; position: CategoryDropPosition } | null>(null);

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
    setCategoryDrop(null);
    lastDragEndAt = Date.now();
    dragActive = false;
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    dragActive = true;
    navigator.vibrate?.(15);
    if (isCategoryDrag(active)) {
      setDraggedCategoryId(active.data.current?.catId);
      return;
    }
    setActiveId(String(active.id));
    setPreview(categories);
  };

  const trackCategoryDrop = (active: Active, over: Over | null) => {
    const targetId = over ? findCategoryId(categories, over.id) : undefined;
    const draggedId = active.data.current?.catId;
    if (!over || !targetId || targetId === draggedId) {
      setCategoryDrop(null);
      return;
    }
    const position = dropPosition(active, over);
    setCategoryDrop(prev => (prev?.catId === targetId && prev.position === position ? prev : { catId: targetId, position }));
  };

  // The before/after half can change while staying over the same category
  const onDragMove = ({ active, over }: DragMoveEvent) => {
    if (isCategoryDrag(active)) trackCategoryDrop(active, over);
  };

  // Moving an item into another category happens live, so the list opens a gap where it will land
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (isCategoryDrag(active)) {
      trackCategoryDrop(active, over);
      return;
    }
    if (!over) return;
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
      const draggedId = active.data.current?.catId;
      if (over && categoryDrop) {
        const next = moveCategory(categories, draggedId, categoryDrop.catId, categoryDrop.position);
        if (next !== categories && next.map(c => c.id).join() !== categories.map(c => c.id).join()) {
          onCommit(next, `Moved ${categories.find(c => c.id === draggedId)?.title || 'category'}`);
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
    categoryDrop,
    shownCategories: preview ?? categories,
    handlers: { onDragStart, onDragMove, onDragOver, onDragEnd, onDragCancel: reset },
  };
};
