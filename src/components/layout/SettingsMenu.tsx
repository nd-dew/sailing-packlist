import React, { useState } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { PRESETS } from '../../utils/presetUtils';

export const SettingsMenu: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, changes, updateChanges,
    applyPreset, deferredPrompt, handleInstallClick, resetAll, past,
    getMenuStyles, categories, luggages, itemLuggage, checkedItems, hiddenItems
  } = usePacklist();

  const { leftMenuStyle, isMenuSwiping } = getMenuStyles();
  const [presetCruise, setPresetCruise] = useState(Object.keys(PRESETS)[0] || '');
  const baseSetQty = changes;

  const handleExport = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      changes,
      categories,
      luggages,
      itemLuggage,
      checkedItems,
      hiddenItems
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sailing-packlist-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`side-menu left-menu ${activeMenu === 'settings' ? 'open' : ''} ${isMenuSwiping ? 'is-swiping' : ''}`} style={leftMenuStyle}>
      <div className="menu-header">
        <h2>Settings</h2>
        <button className="btn-close-menu" onClick={() => setActiveMenu('main')}>✕</button>
      </div>
      <div className="menu-content">
        
        <div className="menu-section history-section">
          <div className="history-header">
            <label>Action History</label>
          </div>
          {past.length === 0 ? (
            <p className="controls-desc">No actions taken yet.</p>
          ) : (
            <ul className="history-log">
              {[...past].reverse().slice(0, 50).map((entry) => (
                <li key={entry.id}>
                  <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                  <span className="log-msg">{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="menu-section">
          <label>Expected Showers</label>
          <div className="stepper-control">
            <button className="stepper-btn" onClick={() => updateChanges(Math.max(1, changes - 1))} disabled={changes <= 1}>−</button>
            <input type="number" className="stepper-input" value={changes} onChange={(e) => updateChanges(parseInt(e.target.value) || 1)} min={1} max={14} />
            <button className="stepper-btn" onClick={() => updateChanges(Math.min(14, changes + 1))} disabled={changes >= 14}>+</button>
          </div>
          <p className="controls-desc">Estimation: <strong>{baseSetQty} Base Sets</strong>. Instead of packing for every night, we estimate how many times you'll actually change base layers based on shower opportunities.</p>
        </div>
        
        <div className="menu-section">
          <label>Cruise Presets</label>
          <p className="controls-desc" style={{color: '#b30000'}}><strong>Warning:</strong> Applying a preset will overwrite your current list! Select your cruise and role to fill in the recommended packing list.</p>
          <div className="preset-selectors" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <select className="modal-select" value={presetCruise} onChange={(e) => setPresetCruise(e.target.value)}>
              {Object.entries(PRESETS).map(([id, data]) => (
                <option key={id} value={id}>{data.name || id}</option>
              ))}
            </select>
            <div className="presets-group" style={{ width: '100%' }}>
              <button className="btn-preset" style={{flex: 1}} onClick={() => applyPreset(presetCruise, 'crew')}>Apply: Crew</button>
              <button className="btn-preset" style={{flex: 1}} onClick={() => applyPreset(presetCruise, 'captain')}>Apply: Captain</button>
            </div>
          </div>
        </div>

        <div className="menu-section global-actions-menu">
          <label>Data Management</label>
          <button onClick={handleExport} className="btn-preset" style={{ width: '100%', marginBottom: '10px' }}>💾 Export Data (JSON)</button>
          <button onClick={() => { resetAll(); setActiveMenu('main'); }} className="btn-reset">⚠️ Factory Reset List</button>
        </div>

        <div className="menu-section">
          <label>App Installation</label>
          {deferredPrompt ? (
            <button 
              onClick={handleInstallClick} 
              className="btn-preset" 
              style={{ width: '100%', background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            >
              📱 Install App to Home Screen
            </button>
          ) : (
            <p className="controls-desc">To install this app on your phone, tap your browser's menu (or the Share button on iOS) and select <strong>"Add to Home Screen"</strong>.</p>
          )}
        </div>

      </div>
    </div>
  );
};
