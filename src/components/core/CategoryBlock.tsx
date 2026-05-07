import React from 'react';
import { usePacklist } from '../../context/PacklistContext';
import type { Category, PackItem } from '../../types';
import { ItemRow } from './ItemRow';

interface CategoryBlockProps {
  cat: Category;
}

export const CategoryBlock: React.FC<CategoryBlockProps> = ({ cat }) => {
  const { 
    filter, hiddenItems, showHiddenCats, handleCreateItem, showPriorityToast, 
    activeToastId, triggerConfirm, unhideAllInCategory, toggleCatHidden, 
    changes, luggages, itemLuggage, unhideItem, commitAction, setCategories,
    itemViewFilter, checkedItems, setSelectedItemId, setSelectedCategoryId
  } = usePacklist();

  if (filter !== 'all' && cat.priority !== filter) return null;

  const itemsToRender: { item: PackItem, isSubItem: boolean, parentName?: string }[] = [];

  cat.items.forEach(item => {
    const isHidden = hiddenItems[item.id];

    if (itemViewFilter === 'all') {
      if (!isHidden) {
        itemsToRender.push({ item, isSubItem: false });
      }
    } else { // 'packed' or 'unpacked'
      if (item.subItems && item.subItems.length > 0) {
        // Unroll sub-items when a filter is active
        item.subItems.forEach(subItem => {
          const isSubItemPacked = !!checkedItems[subItem.id];
          const subItemMatchesFilter = 
            (itemViewFilter === 'packed' && isSubItemPacked) ||
            (itemViewFilter === 'unpacked' && !isSubItemPacked);

          if (subItemMatchesFilter) {
            itemsToRender.push({ item: subItem, isSubItem: true, parentName: item.name });
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
    
  const hiddenCatItems = cat.items.filter(item => hiddenItems[item.id]);
  const isShowingHidden = showHiddenCats[cat.id];
  const baseSetQty = changes;

  // Calculate if category is entirely "done"
  let catTotal = 0;
  let catPacked = 0;
  cat.items.forEach(item => {
    if (item.subItems && item.subItems.length > 0) {
      const countRecursive = (subItems: PackItem[]) => {
        subItems.forEach(subItem => {
          if (subItem.subItems) {
            countRecursive(subItem.subItems);
          } else {
            catTotal++;
            if (checkedItems[subItem.id]) catPacked++;
          }
        });
      };
      countRecursive(item.subItems);
    } else {
      catTotal++;
      if (checkedItems[item.id]) catPacked++;
    }
  });
  
  const isDone = catTotal > 0 && catTotal === catPacked;

  if (cat.items.length === 0) return null; // Only hide completely empty categories

  // Hide the category entirely if we're filtering and there are no matching items
  if (itemViewFilter !== 'all' && itemsToRender.length === 0) return null;
  // If not filtering, and there's nothing to render, and no hidden items, hide it
  if (itemViewFilter === 'all' && itemsToRender.length === 0 && hiddenCatItems.length === 0) return null;

  return (
    <div className="category-block">
      <div className={`category-header ${isDone ? 'done' : ''}`}>
        <div className="category-title-area">
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <h3 onClick={() => setSelectedCategoryId(cat.id)} style={{ cursor: 'pointer' }} title="Edit Category">{cat.title}</h3>
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
        {itemsToRender.map(({ item, isSubItem, parentName }) => {
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
              parentName={parentName}
            />
          );
        })}
        {isShowingHidden && hiddenCatItems.map(item => (
          <li key={item.id} className={`list-item grayed-out clickable ${checkedItems[item.id] ? 'checked' : ''}`} onClick={() => setSelectedItemId(item.id)}>
            <div className="item-row">
              <div className="item-main" style={{ cursor: 'pointer' }}>
                <span className="item-name" style={{ textDecoration: 'none' }}>{item.name}</span>
              </div>
              <div className="hidden-actions" onClick={(e) => e.stopPropagation()}>
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
