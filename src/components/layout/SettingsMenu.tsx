import React, { useState } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { PRESETS } from '../../utils/presetUtils';

export const SettingsMenu: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, changes, updateChanges, filter, setFilter, 
    getMissingCount, applyPreset, deferredPrompt, handleInstallClick, resetAll, past,
    getMenuStyles
  } = usePacklist();

  const { leftMenuStyle, isMenuSwiping } = getMenuStyles();
  const [presetCruise, setPresetCruise] = useState(Object.keys(PRESETS)[0] || '');
  const baseSetQty = changes;

  return (
    <div className={`side-menu left-menu ${activeMenu === 'settings' ? 'open' : ''} ${isMenuSwiping ? 'is-swiping' : ''}`} style={leftMenuStyle}>
      <div className="menu-header">
        <h2>Settings</h2>
        <button className="btn-close-menu" onClick={() => setActiveMenu('main')}>✕</button>
      </div>
      <div className="menu-content">
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
          <label>Quick Filters</label>
          <p className="controls-desc">Show only specific items. The number shows how many items are still <strong>missing</strong> in that group.</p>
          <div className="filters-group" style={{marginTop: '10px'}}>
            <button className={`btn-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); setActiveMenu('main'); }}>Show All ({getMissingCount('all')})</button>
            <button className={`btn-filter ${filter === 'must-have' ? 'active' : ''} pri-must`} onClick={() => { setFilter('must-have'); setActiveMenu('main'); }}>★★★ Must ({getMissingCount('must-have')})</button>
            <button className={`btn-filter ${filter === 'should-have' ? 'active' : ''} pri-should`} onClick={() => { setFilter('should-have'); setActiveMenu('main'); }}>★★☆ Should ({getMissingCount('should-have')})</button>
            <button className={`btn-filter ${filter === 'nice-to-have' ? 'active' : ''} pri-nice`} onClick={() => { setFilter('nice-to-have'); setActiveMenu('main'); }}>★☆☆ Nice ({getMissingCount('nice-to-have')})</button>
          </div>
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

        <div className="menu-section">
          <label>Contribute</label>
          <p className="controls-desc">This is an open-source project. You can contribute new packing lists or improve the app on GitHub.</p>
          <a 
            href="https://github.com/nd-dew/sailing-packlist" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-preset" 
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '10px' }}
          >
            💻 View on GitHub
          </a>
        </div>

        <div className="menu-section global-actions-menu">          <button onClick={() => { resetAll(); setActiveMenu('main'); }} className="btn-reset">Factory Reset List</button>
        </div>

        <div className="menu-section history-section">
          <div className="history-header">
            <label>Action History</label>
          </div>
          {past.length === 0 ? (
            <p className="controls-desc">No actions taken yet.</p>
          ) : (
            <ul className="history-log">
              {[...past].reverse().slice(0, 10).map((entry) => (
                <li key={entry.id}>
                  <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                  <span className="log-msg">{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
