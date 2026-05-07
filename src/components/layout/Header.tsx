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
    categories, checkedItems, itemViewFilter, setItemViewFilter, particles 
  } = usePacklist();
  
  const [showStats, setShowStats] = useState(false);
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
        setTimeout(() => setPop('green'), 450); 
      } else if (packedItems < (prevPacked as number)) {
        setTimeout(() => setPop('red'), 450);
      }
      const popTimer = setTimeout(() => setPop(null), 850);
      return () => clearTimeout(popTimer);
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
      {particles.map(p => (
        <div
          key={p.id}
          className={`flow-particle ${p.type === 'to-green' ? 'anim-to-green-dyn' : 'anim-to-red-dyn'}`}
          style={{ 
            '--start-x': `${p.x}px`, 
            '--start-y': `${p.y}px` 
          } as React.CSSProperties}
        />
      ))}
      <button className="header-icon-btn" onClick={() => setActiveMenu('settings')}>☰</button>
      <div className="header-title-area">
        <button onClick={undo} disabled={past.length === 0} className="header-undo-btn big-btn" title="Undo">↶</button>
        <div className="header-title-fader">
          <h1 className={showStats ? 'fade-out' : 'fade-in'}>PackList</h1>
          <div className={`header-stats ${showStats ? 'fade-in' : 'fade-out'}`}>
            <div 
              className={`stat-number done ${itemViewFilter === 'packed' ? 'active' : ''} ${pop === 'green' ? 'pop-stat' : ''}`}
              onClick={() => handleFilterClick('packed')}
              title="Filter by Packed"
              id="stat-green"
            >
              {packedItems}
            </div>
            <div 
              className={`stat-number todo ${itemViewFilter === 'unpacked' ? 'active' : ''} ${pop === 'red' ? 'pop-stat' : ''}`}
              onClick={() => handleFilterClick('unpacked')}
              title="Filter by Unpacked"
              id="stat-red"
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
