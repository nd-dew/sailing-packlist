import React from 'react';
import { PacklistProvider, usePacklist } from './context/PacklistContext';
import { Header } from './components/layout/Header';
import { SettingsMenu } from './components/layout/SettingsMenu';
import { BaggageMenu } from './components/layout/BaggageMenu';
import { CategoryBlock } from './components/core/CategoryBlock';
import { ItemModal } from './components/modals/ItemModal';
import { BagModal } from './components/modals/BagModal';
import './App.css';

const AppContent: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, confirmToast, categories,
    handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd
  } = usePacklist();

  return (
    <div 
      className="app-container" 
      onTouchStart={handleGlobalTouchStart} 
      onTouchMove={handleGlobalTouchMove} 
      onTouchEnd={handleGlobalTouchEnd}
    >
      <Header />
      
      {activeMenu !== 'main' && <div className="menu-overlay" onClick={() => setActiveMenu('main')} />}

      {confirmToast && (
        <div className="confirm-toast-overlay">
          <div className="confirm-toast">
            {confirmToast.message}
          </div>
        </div>
      )}

      <SettingsMenu />
      <BaggageMenu />

      <ItemModal />
      <BagModal />

      <div className="checklist-grid">
        <div className="checklist-column">
          {categories.filter(cat => ['docs', 'tough', 'base'].includes(cat.id)).map(cat => (
            <CategoryBlock key={cat.id} cat={cat} />
          ))}
        </div>
        <div className="checklist-column">
          {categories.filter(cat => !['docs', 'tough', 'base'].includes(cat.id)).map(cat => (
            <CategoryBlock key={cat.id} cat={cat} />
          ))}
        </div>
      </div>

      <footer className="app-footer">
        <a href="https://www.sailingcommunity.be/" target="_blank" rel="noopener noreferrer">
          <img src={`${import.meta.env.BASE_URL}bsc.ico`} alt="BSC" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Belgian Sailing Community
        </a>
        <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
        <a href="https://github.com/nd-dew/sailing-packlist" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>
          GitHub
        </a>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <PacklistProvider>
      <AppContent />
    </PacklistProvider>
  );
};

export default App;
