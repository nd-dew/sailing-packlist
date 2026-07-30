import React, { useEffect } from 'react';
import { PacklistProvider, usePacklist } from './context/PacklistContext';
import { Header } from './components/layout/Header';
import { SettingsMenu } from './components/layout/SettingsMenu';
import { BaggageMenu } from './components/layout/BaggageMenu';
import { CategoryBlock } from './components/core/CategoryBlock';
import { ItemModal } from './components/modals/ItemModal';
import { BagModal } from './components/modals/BagModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { decompressPayload } from './utils/shareUtils';
import { PRESETS } from './utils/presetUtils';
import './App.css';

const AppContent: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, confirmToast, categories, itemViewFilter,
    handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd,
    loadSharedState, handleCreateCategory,
    pendingPreset, setPendingPreset, executeApplyPreset
  } = usePacklist();

  const [pendingSharePayload, setPendingSharePayload] = React.useState<any>(null);
  const [pendingPresetId, setPendingPresetId] = React.useState<string | null>(null);

  useEffect(() => {
    const handleUrlHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#s=')) {
        const shareToken = hash.substring(3);
        try {
          const unpacked = await decompressPayload(shareToken);
          setPendingSharePayload(unpacked);
        } catch (err) {
          console.error("Failed to parse shared URL:", err);
          alert("Failed to parse shared URL. The link might be invalid or broken.");
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else if (hash.startsWith('#p=')) {
        const presetId = hash.substring(3);
        if (PRESETS[presetId]) {
          setPendingPresetId(presetId);
        } else {
          console.warn("Preset not found:", presetId);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };
    handleUrlHash();
  }, []);

  const handleAcceptShare = () => {
    if (pendingSharePayload) {
      loadSharedState(pendingSharePayload);
    }
    setPendingSharePayload(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleCancelShare = () => {
    setPendingSharePayload(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleApplyPresetUrl = (role: 'crew' | 'captain') => {
    if (pendingPresetId) {
      executeApplyPreset(pendingPresetId, role);
    }
    setPendingPresetId(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleCancelPresetUrl = () => {
    setPendingPresetId(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Dynamically balance categories into two columns for desktop view
  const leftCol: typeof categories = [];
  const rightCol: typeof categories = [];
  let leftWeight = 0;
  let rightWeight = 0;

  categories.forEach(cat => {
    const weight = cat.items.length + 3; // weight is proportional to item count + header padding
    if (leftWeight <= rightWeight) {
      leftCol.push(cat);
      leftWeight += weight;
    } else {
      rightCol.push(cat);
      rightWeight += weight;
    }
  });

  return (
    <>
      <div className={`filter-glow-frame ${itemViewFilter === 'packed' ? 'packed' : itemViewFilter === 'unpacked' ? 'unpacked' : ''}`} />
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

      {pendingSharePayload && (
        <div className="share-confirm-overlay">
          <div className="share-confirm-card">
            <span className="share-confirm-icon">⛵</span>
            <h3>Shared Packlist Detected</h3>
            <p>Seems like someone gave you a link with an included packlist configured. Do you want to open it? (it will override whatever you currently have?)</p>
            <div className="share-confirm-actions">
              <button onClick={handleCancelShare} className="btn-share-confirm cancel">Cancel</button>
              <button onClick={handleAcceptShare} className="btn-share-confirm confirm">Yes, Load</button>
            </div>
          </div>
        </div>
      )}

      {pendingPreset && (
        <div className="share-confirm-overlay">
          <div className="share-confirm-card warning-card">
            <span className="share-confirm-icon warning-icon">⚠️</span>
            <h3>Factory Reset List?</h3>
            <p>This will completely factory reset your list to the <strong>{pendingPreset.role.toUpperCase()}</strong> preset. All custom items, bag assignments, and packing progress will be permanently lost! Are you sure?</p>
            <div className="share-confirm-actions">
              <button onClick={() => setPendingPreset(null)} className="btn-share-confirm cancel">Cancel</button>
              <button onClick={() => executeApplyPreset(pendingPreset.cruise, pendingPreset.role)} className="btn-share-confirm confirm warning-confirm">Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      {pendingPresetId && (
        <div className="share-confirm-overlay">
          <div className="share-confirm-card">
            <span className="share-confirm-icon">⛵</span>
            <h3>Preset Detected</h3>
            <p style={{ margin: '0 0 8px 0' }}>This link contains the following preset:</p>
            <div className="preset-detected-badge">
              {PRESETS[pendingPresetId]?.name || pendingPresetId}
            </div>
            <p style={{ margin: '8px 0 15px 0' }}>How would you like to load it?</p>
            <div className="share-confirm-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button onClick={() => handleApplyPresetUrl('crew')} className="btn-share-confirm confirm" style={{ flex: 1 }}>
                  Load as Crew
                </button>
                <button onClick={() => handleApplyPresetUrl('captain')} className="btn-share-confirm confirm" style={{ flex: 1 }}>
                  Load as Captain
                </button>
              </div>
              <button onClick={handleCancelPresetUrl} className="btn-share-confirm cancel" style={{ width: '100%' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsMenu />
      <BaggageMenu />

      <ItemModal />
      <BagModal />
      <CategoryModal />

      <div className="checklist-grid">
        <div className="checklist-column">
          {leftCol.map(cat => (
            <CategoryBlock key={cat.id} cat={cat} />
          ))}
        </div>
        <div className="checklist-column">
          {rightCol.map(cat => (
            <CategoryBlock key={cat.id} cat={cat} />
          ))}
          
          <div className="category-block btn-add-category-block" onClick={() => handleCreateCategory()}>
            <div className="category-header add-category-header">
              <div className="category-title-area add-category-title-area">
                <h3>Add Category</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <a href="https://www.sailingcommunity.be/" target="_blank" rel="noopener noreferrer">
          <img src={`${import.meta.env.BASE_URL}bsc.ico`} alt="BSC" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Belgian Sailing Community
        </a>
        <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
        <a href="https://github.com/nd-dew/sailing-packlist" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'normal', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </footer>
    </div>
    </>
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
