import React, { useRef } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { PRESETS } from '../../utils/presetUtils';
import { parse, stringify } from 'yaml';

export const SettingsMenu: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, changes, updateChanges,
    deferredPrompt, handleInstallClick, past,
    getMenuStyles, categories, luggages, itemLuggage, checkedItems,
    theme, setTheme, importData, soundEnabled, setSoundEnabled,
    activePresetId, activeTrip, cruiseDescription, warnings,
    layoutColumns, setLayoutColumns, density, setDensity, showPriorities, setShowPriorities
  } = usePacklist();

  const { leftMenuStyle, isMenuSwiping } = getMenuStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseSetQty = changes;

  const handleExport = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      name: activeTrip.name,
      description: cruiseDescription,
      changes,
      warnings,
      categories,
      luggages,
      itemLuggage,
      checkedItems
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

  const hideShowers = PRESETS[activePresetId]?.hideShowers === true;

  return (
    <div className={`side-menu left-menu ${activeMenu === 'settings' ? 'open' : ''} ${isMenuSwiping ? 'is-swiping' : ''}`} style={leftMenuStyle}>
      <div className="menu-header">
        <h2>Settings</h2>
        <button className="btn-close-menu" onClick={() => setActiveMenu('main')} aria-label="Close menu">✕</button>
      </div>
      <div className="menu-content settings-menu">

        {/* Showers */}
        {!hideShowers && (
          <section className="menu-group">
            <span className="menu-group-label">Packing</span>
            <div className="menu-card">
              <div className="menu-row">
                <div className="menu-row-text">
                  <span className="menu-row-title">Expected showers</span>
                  <span className="menu-row-hint">{baseSetQty}× underwear, socks &amp; t-shirts</span>
                </div>
                <div className="stepper-control">
                  <button className="stepper-btn" onClick={() => updateChanges(Math.max(1, changes - 1))} disabled={changes <= 1} aria-label="Fewer showers">−</button>
                  <input type="number" className="stepper-input" value={changes} onChange={(e) => updateChanges(parseInt(e.target.value) || 1)} min={1} max={14} aria-label="Expected showers" />
                  <button className="stepper-btn" onClick={() => updateChanges(Math.min(14, changes + 1))} disabled={changes >= 14} aria-label="More showers">+</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Appearance & layout */}
        <section className="menu-group">
          <span className="menu-group-label">Appearance</span>
          <div className="menu-card menu-card-rows">
            <div className="menu-row">
              <span className="menu-row-title">Theme</span>
              <div className="segmented" role="radiogroup" aria-label="Theme">
                <button role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>☀️ Light</button>
                <button role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>🌙 Dark</button>
              </div>
            </div>
            <div className="menu-row">
              <span className="menu-row-title">Density</span>
              <div className="segmented" role="radiogroup" aria-label="Density">
                <button role="radio" aria-checked={density === 'comfortable'} className={density === 'comfortable' ? 'active' : ''} onClick={() => setDensity('comfortable')}>Comfy</button>
                <button role="radio" aria-checked={density === 'compact'} className={density === 'compact' ? 'active' : ''} onClick={() => setDensity('compact')}>Compact</button>
              </div>
            </div>
            <div className="menu-row desktop-only">
              <span className="menu-row-title">Columns</span>
              <div className="segmented" role="radiogroup" aria-label="Columns">
                {([1, 2, 3] as const).map(n => (
                  <button key={n} role="radio" aria-checked={layoutColumns === n} className={layoutColumns === n ? 'active' : ''} onClick={() => setLayoutColumns(n)} title={`${n} column${n > 1 ? 's' : ''}`}>
                    <span className="col-icon" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="menu-row">
              <span className="menu-row-title">Priorities (stars)</span>
              <button
                role="switch"
                aria-checked={showPriorities}
                aria-label="Show priorities"
                className={`switch ${showPriorities ? 'on' : ''}`}
                onClick={() => setShowPriorities(!showPriorities)}
                title={showPriorities ? 'Hide priorities' : 'Show priorities'}
              >
                <span className="switch-knob" />
              </button>
            </div>
            <div className="menu-row">
              <span className="menu-row-title">Sounds</span>
              <button
                role="switch"
                aria-checked={soundEnabled}
                className={`switch ${soundEnabled ? 'on' : ''}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
              >
                <span className="switch-knob" />
              </button>
            </div>
          </div>
        </section>

        {/* Data & sharing */}
        <section className="menu-group">
          <span className="menu-group-label">Backup</span>
          <div className="menu-card menu-card-rows menu-list">
            <button onClick={handleExport} className="menu-list-btn">
              <span>💾</span> Export to YAML
            </button>
            <input type="file" accept=".yaml,.yml" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileImport} />
            <button onClick={() => fileInputRef.current?.click()} className="menu-list-btn">
              <span>📂</span> Import from YAML
            </button>
            {deferredPrompt && (
              <button onClick={handleInstallClick} className="menu-list-btn">
                <span>📱</span> Install App
              </button>
            )}
          </div>
        </section>

        {/* Action history */}
        <details className="history-disclosure">
          <summary>📜 Action history ({past.length})</summary>
          <div className="history-panel">
            {past.length === 0 ? (
              <p className="controls-desc" style={{ margin: 0 }}>No actions taken yet.</p>
            ) : (
              <ul className="history-log">
                {[...past].reverse().slice(0, 30).map((entry) => (
                  <li key={entry.id}>
                    <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                    <span className="log-msg">{entry.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>

      </div>
    </div>
  );
};
