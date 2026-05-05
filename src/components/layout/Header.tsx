import React from 'react';
import { usePacklist } from '../../context/PacklistContext';

export const Header: React.FC = () => {
  const { showHeader, setActiveMenu, undo, redo, past, future } = usePacklist();

  return (
    <header className={`app-header ${showHeader ? '' : 'hidden'}`}>
      <button className="header-icon-btn" onClick={() => setActiveMenu('settings')}>☰</button>
      <div className="header-title-area">
        <button onClick={undo} disabled={past.length === 0} className="header-undo-btn big-btn" title="Undo">↶</button>
        <h1>PackList</h1>
        <button onClick={redo} disabled={future.length === 0} className="header-undo-btn big-btn" title="Redo">↷</button>
      </div>
      <button className="header-icon-btn" onClick={() => setActiveMenu('baggage')}>🎒</button>
    </header>
  );
};
