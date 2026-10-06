import React, { useState, useEffect, useRef } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import type { ItemViewFilter } from '../../types';
import { countLeafItems } from '../../utils/countUtils';

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

  const { total: totalItems, packed: packedItems } = countLeafItems(categories.flatMap(cat => cat.items), checkedItems);
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
      {particles.map((p: any) => (
        <div
          key={p.id}
          className={`flow-particle ${p.type === 'to-green' ? 'anim-to-green-dyn' : 'anim-to-red-dyn'}`}
          style={{ 
            '--start-x': `${p.x}px`, 
            '--start-y': `${p.y}px`,
            '--target-x': `${p.targetX ?? (p.type === 'to-green' ? window.innerWidth / 2 - 35 : window.innerWidth / 2 + 35)}px`,
            '--target-y': `${p.targetY ?? 25}px`
          } as React.CSSProperties}
        />
      ))}
      <button className="header-icon-btn" onClick={() => setActiveMenu('settings')} title="Settings" aria-label="Menu">☰</button>
      <div className="header-title-area">
        <button onClick={undo} disabled={past.length === 0} className="header-undo-btn big-btn" title={past.length ? `Undo: ${past[past.length - 1].message}` : 'Nothing to undo'} aria-label="Undo"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg></button>
        <div className="header-title-fader">
          <h1 className={showStats ? 'fade-out' : 'fade-in'}>PackList</h1>
          <div className={`header-stats ${showStats ? 'fade-in' : 'fade-out'}`}>
            <div 
              className={`stat-number done ${itemViewFilter === 'packed' ? 'active' : ''} ${pop === 'green' ? 'pop-stat' : ''}`}
              onClick={() => handleFilterClick('packed')}
              title={itemViewFilter === 'packed' ? 'Show everything again' : 'Show only packed items'}
              id="stat-green"
              data-label="packed"
            >
              {packedItems}
            </div>
            <div 
              className={`stat-number todo ${itemViewFilter === 'unpacked' ? 'active' : ''} ${pop === 'red' ? 'pop-stat' : ''}`}
              onClick={() => handleFilterClick('unpacked')}
              title={itemViewFilter === 'unpacked' ? 'Show everything again' : 'Show only what is left to pack'}
              id="stat-red"
              data-label="to go"
            >
              {unpackedItems}
            </div>
          </div>
        </div>
        <button onClick={redo} disabled={future.length === 0} className="header-undo-btn big-btn" title={future.length ? `Redo: ${future[0].message}` : 'Nothing to redo'} aria-label="Redo"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg></button>
      </div>
      <button className="header-icon-btn" onClick={() => setActiveMenu('baggage')} title="Bags and what goes in them" aria-label="Baggage">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
          <rect x="3" y="7" width="18" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      </button>
      <div className="header-progress" aria-hidden="true">
        <div className="header-progress-fill" style={{ width: `${totalItems > 0 ? (packedItems / totalItems) * 100 : 0}%` }} />
      </div>
    </header>
  );
};
