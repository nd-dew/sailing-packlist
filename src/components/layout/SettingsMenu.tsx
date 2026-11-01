import React from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { PRESETS } from '../../utils/presetUtils';

export const SettingsMenu: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, changes, updateChanges,
    deferredPrompt, handleInstallClick, past,
    getMenuStyles,
    theme, setTheme, soundEnabled, setSoundEnabled,
    activePresetId,
    layoutColumns, setLayoutColumns, density, setDensity, showPriorities, setShowPriorities
  } = usePacklist();

  const { leftMenuStyle, isMenuSwiping } = getMenuStyles();
  const baseSetQty = changes;

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

        {/* Export / import live in the packlists menu (the list title) */}
        {deferredPrompt && (
          <section className="menu-group">
            <span className="menu-group-label">App</span>
            <div className="menu-card menu-card-rows menu-list">
              <button onClick={handleInstallClick} className="menu-list-btn">
                <span>📱</span> Install App
              </button>
            </div>
          </section>
        )}

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
