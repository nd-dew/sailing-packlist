import React, { useState, useRef } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { PRESETS } from '../../utils/presetUtils';
import { parse, stringify } from 'yaml';

export const SettingsMenu: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, changes, updateChanges,
    applyPreset, deferredPrompt, handleInstallClick, resetAll, past,
    getMenuStyles, categories, luggages, itemLuggage, checkedItems, hiddenItems,
    theme, setTheme, importData
  } = usePacklist();

  const { leftMenuStyle, isMenuSwiping } = getMenuStyles();
  const [presetCruise, setPresetCruise] = useState(Object.keys(PRESETS)[0] || '');
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const yamlStr = stringify(data);
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sailing-packlist-export-${new Date().toISOString().slice(0, 10)}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = parse(event.target?.result as string);
        importData(data);
      } catch (err) {
        alert('Failed to parse file. Make sure it is a valid YAML export.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleUrlImport = async () => {
    if (!importUrl) return;
    try {
      const res = await fetch(importUrl);
      const text = await res.text();
      const data = parse(text);
      importData(data);
      setImportUrl('');
    } catch (err) {
      alert('Failed to fetch or parse data from URL. Ensure the URL returns valid YAML.');
    }
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
          <label>Appearance</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              className={`btn-preset ${theme === 'light' ? 'active' : ''}`} 
              style={{ flex: 1, background: theme === 'light' ? 'var(--navy)' : 'transparent', color: theme === 'light' ? 'white' : 'var(--text)' }} 
              onClick={() => setTheme('light')}
            >
              ☀️ Light
            </button>
            <button 
              className={`btn-preset ${theme === 'dark' ? 'active' : ''}`} 
              style={{ flex: 1, background: theme === 'dark' ? 'var(--navy)' : 'transparent', color: theme === 'dark' ? 'white' : 'var(--text)' }} 
              onClick={() => setTheme('dark')}
            >
              🌙 Dark
            </button>
          </div>
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
          <button onClick={handleExport} className="btn-preset" style={{ width: '100%', marginBottom: '10px' }}>💾 Export Data (YAML)</button>
          
          <input type="file" accept=".yaml,.yml" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileImport} />
          <button onClick={() => fileInputRef.current?.click()} className="btn-preset" style={{ width: '100%', marginBottom: '10px' }}>📂 Import from File</button>
          
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <input type="text" className="luggage-add-input" style={{ border: '1px solid var(--border)', borderRadius: '6px' }} placeholder="https://.../list.yaml" value={importUrl} onChange={e => setImportUrl(e.target.value)} />
            <button onClick={handleUrlImport} className="btn-luggage-add" style={{ borderRadius: '6px' }}>Import</button>
          </div>

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
