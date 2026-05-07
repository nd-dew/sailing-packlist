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
    itemViewFilter, checkedItems
  } = usePacklist();

  if (filter !== 'all' && cat.priority !== filter) return null;

  const getFilteredItems = () => {
    let items: PackItem[] = [];
    cat.items.forEach(item => {
      const isUnpacked = !checkedItems[item.id];
      const isPacked = !!checkedItems[item.id];
      const isHidden = hiddenItems[item.id];

      if (itemViewFilter === 'all') {
        if (!isHidden) {
          items.push(item);
        }
      } else if (itemViewFilter === 'unpacked') {
        if (item.subItems) {
          if (!isPacked) { // Show parent if it's not fully packed
            items.push(item);
          }
        } else if (isUnpacked) {
          items.push(item);
        }
      } else if (itemViewFilter === 'packed') {
        if (item.subItems) {
          if (isPacked) {
            items.push(item);
          }
        } else if (isPacked && !isHidden) {
          items.push(item);
        }
      }
    });
    return items;
  };

  const activeItems = getFilteredItems();
  const hiddenCatItems = cat.items.filter(item => hiddenItems[item.id]);
  const isShowingHidden = showHiddenCats[cat.id];
  const baseSetQty = changes;

  if (activeItems.length === 0 && hiddenCatItems.length === 0) return null;
  if (activeItems.length === 0 && !isShowingHidden) return null;

  return (
    <div className="category-block">
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

          return (
            <ItemRow 
              key={item.id} 
              item={item} 
              displayQty={displayQty} 
              assignedLugIdx={assignedLugIdx} 
            />
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
