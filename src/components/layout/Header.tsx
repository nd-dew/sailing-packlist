import React from 'react';
import { usePacklist } from '../../context/PacklistContext';

export const Header: React.FC = () => {
  const { showHeader, setActiveMenu, undo, redo, past, future } = usePacklist();

  return (
    <header className={`app-header ${showHeader ? '' : 'hidden'}`}>
      <button className="header-icon-btn" onClick={() => setActiveMenu('settings')}>☰</button>
      <div className="header-title-area">
        <button onClick={undo} disabled={past.length === 0} className="header-undo-btn big-btn" title="Undo">↶</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1>PackList</h1>
          <a href="https://github.com/nd-dew/sailing-packlist" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.6em', color: 'var(--navy)', opacity: 0.6, textDecoration: 'none', fontWeight: 'bold' }}>GitHub</a>
        </div>
        <button onClick={redo} disabled={future.length === 0} className="header-undo-btn big-btn" title="Redo">↷</button>
      </div>
      <button className="header-icon-btn" onClick={() => setActiveMenu('baggage')}>🎒</button>
    </header>
  );
};
