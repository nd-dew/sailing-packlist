import React, { useState, useEffect, useRef } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import type { ItemViewFilter } from '../../types';

function usePrevious(value: any) {
  const ref = useRef<any>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const Header: React.FC = () => {
  const { 
    showHeader, setActiveMenu, undo, redo, past, future, 
    categories, checkedItems, itemViewFilter, setItemViewFilter 
  } = usePacklist();
  
  const [showStats, setShowStats] = useState(false);
  const [animation, setAnimation] = useState<{ id: number; type: 'to-green' | 'to-red' } | null>(null);
  const [pop, setPop] = useState<'green' | 'red' | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowStats(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalItems = categories.flatMap(cat => cat.items.filter(i => i.name.trim())).length;
  const packedItems = Object.values(checkedItems).filter(v => v).length;
  const unpackedItems = totalItems - packedItems;

  const prevPacked = usePrevious(packedItems);

  useEffect(() => {
    if (prevPacked !== undefined) {
      if (packedItems > (prevPacked as number)) {
        setAnimation({ id: Date.now(), type: 'to-green' });
        setTimeout(() => setPop('green'), 400); 
      } else if (packedItems < (prevPacked as number)) {
        setAnimation({ id: Date.now(), type: 'to-red' });
        setTimeout(() => setPop('red'), 400);
      }
      
      const animTimer = setTimeout(() => setAnimation(null), 600);
      const popTimer = setTimeout(() => setPop(null), 700);

      return () => {
        clearTimeout(animTimer);
        clearTimeout(popTimer);
      };
    }
  }, [packedItems, prevPacked]);

  const handleFilterClick = (filter: ItemViewFilter) => {
    if (itemViewFilter === filter) {
      setItemViewFilter('all');
    } else {
      setItemViewFilter(filter);
    }
  };

  return (
    <header className={`app-header ${showHeader ? '' : 'hidden'}`}>
      <button className="header-icon-btn" onClick={() => setActiveMenu('settings')}>☰</button>
      <div className="header-title-area">
        <button onClick={undo} disabled={past.length === 0} className="header-undo-btn big-btn" title="Undo">↶</button>
        <div className="header-title-fader">
          <h1 className={showStats ? 'fade-out' : 'fade-in'}>PackList</h1>
          <div className={`header-stats ${showStats ? 'fade-in' : 'fade-out'}`}>
            
            {animation && (
              <div
                key={animation.id}
                className={`flow-particle ${animation.type === 'to-green' ? 'anim-to-green' : 'anim-to-red'}`}
              />
            )}

            <div 
              className={`stat-number done ${itemViewFilter === 'packed' ? 'active' : ''} ${pop === 'green' ? 'pop-stat' : ''}`}
              onClick={() => handleFilterClick('packed')}
              title="Filter by Packed"
            >
              {packedItems}
            </div>
            <div 
              className={`stat-number todo ${itemViewFilter === 'unpacked' ? 'active' : ''} ${pop === 'red' ? 'pop-stat' : ''}`}
              onClick={() => handleFilterClick('unpacked')}
              title="Filter by Unpacked"
            >
              {unpackedItems}
            </div>
          </div>
        </div>
        <button onClick={redo} disabled={future.length === 0} className="header-undo-btn big-btn" title="Redo">↷</button>
      </div>
      <button className="header-icon-btn" onClick={() => setActiveMenu('baggage')}>🎒</button>
    </header>
  );
};
