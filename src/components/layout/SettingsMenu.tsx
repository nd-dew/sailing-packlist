import React, { useState, useRef } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { PRESETS } from '../../utils/presetUtils';
import { parse, stringify } from 'yaml';
import { compressPayload } from '../../utils/shareUtils';

export const SettingsMenu: React.FC = () => {
  const { 
    activeMenu, setActiveMenu, changes, updateChanges,
    applyPreset, deferredPrompt, handleInstallClick, past,
    getMenuStyles, categories, luggages, itemLuggage, checkedItems, hiddenItems,
    theme, setTheme, importData, soundEnabled, setSoundEnabled,
    getSharePayload, playPopSound, cruiseDescription, setCruiseDescription, triggerConfirm
  } = usePacklist();

  const { leftMenuStyle, isMenuSwiping } = getMenuStyles();
  const [presetCruise, setPresetCruise] = useState(PRESETS['zeeland_fox_22'] ? 'zeeland_fox_22' : (Object.keys(PRESETS)[0] || ''));
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

  const handleShareList = async () => {
    playPopSound('click');
    try {
      const payload = getSharePayload();
      const hash = await compressPayload(payload);
      const shareUrl = `${window.location.origin}${window.location.pathname}#s=${hash}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("📋 Shareable list layout copied to clipboard! Send it to your crew.");
    } catch (err) {
      console.error("Failed to generate share link:", err);
      alert("Failed to generate share link.");
    }
  };

  const handleSharePreset = async () => {
    playPopSound('click');
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}#p=${presetCruise}`;
      await navigator.clipboard.writeText(shareUrl);
      triggerConfirm(`📋 Link to "${PRESETS[presetCruise]?.name || presetCruise}" copied to clipboard!`, '', () => {});
    } catch (err) {
      console.error("Failed to copy preset link:", err);
      const shareUrl = `${window.location.origin}${window.location.pathname}#p=${presetCruise}`;
      alert(`📋 Preset Link:\n${shareUrl}`);
    }
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

  const selectedPresetDesc = PRESETS[presetCruise]?.description || "No description available.";

  return (
    <div className={`side-menu left-menu ${activeMenu === 'settings' ? 'open' : ''} ${isMenuSwiping ? 'is-swiping' : ''}`} style={leftMenuStyle}>
      <div className="menu-header">
        <h2>Settings</h2>
        <button className="btn-close-menu" onClick={() => setActiveMenu('main')}>✕</button>
      </div>
      <div className="menu-content" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* 1. Cruise Preset at the TOP */}
        <div className="menu-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>Cruise Preset</label>
            <button 
              className="btn-preset-copy-inline" 
              onClick={handleSharePreset}
              title="Copy link to this preset"
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                fontSize: '1em',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              🔗 <span style={{ fontSize: '0.85em', textDecoration: 'underline' }}>Copy Link</span>
            </button>
          </div>
          <div className="preset-selectors" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select className="modal-select" style={{ width: '100%', margin: 0 }} value={presetCruise} onChange={(e) => setPresetCruise(e.target.value)}>
              {Object.entries(PRESETS).map(([id, data]) => (
                <option key={id} value={id}>{data.name || id}</option>
              ))}
            </select>
            <p style={{ margin: '4px 0 2px 0', fontSize: '0.85em', fontWeight: 'bold', color: 'var(--text)', textAlign: 'left' }}>
              Active Preset: {PRESETS[presetCruise]?.name || presetCruise}
            </p>
            <textarea
              className="preset-description-textarea"
              value={cruiseDescription || selectedPresetDesc}
              onChange={(e) => setCruiseDescription(e.target.value)}
              placeholder="Describe your cruise details here..."
              title="Click to edit trip description"
            />
            <div className="presets-group" style={{ width: '100%', gap: '8px' }}>
              <button className="btn-preset" style={{flex: 1, padding: '6px', fontSize: '0.85em'}} onClick={() => applyPreset(presetCruise, 'crew')}>Apply: Crew</button>
              <button className="btn-preset" style={{flex: 1, padding: '6px', fontSize: '0.85em'}} onClick={() => applyPreset(presetCruise, 'captain')}>Apply: Captain</button>
            </div>
          </div>
        </div>

        {/* 2. Expected Showers */}
        <div className="menu-section">
          <label>Expected Showers</label>
          <div className="stepper-control" style={{ margin: '8px 0' }}>
            <button className="stepper-btn" onClick={() => updateChanges(Math.max(1, changes - 1))} disabled={changes <= 1}>−</button>
            <input type="number" className="stepper-input" value={changes} onChange={(e) => updateChanges(parseInt(e.target.value) || 1)} min={1} max={14} />
            <button className="stepper-btn" onClick={() => updateChanges(Math.min(14, changes + 1))} disabled={changes >= 14}>+</button>
          </div>
          <p className="controls-desc">Estimation: <strong>{baseSetQty} Base Sets</strong>. Calculated dynamically.</p>
        </div>

        {/* 3. Appearance & Sound Compact Toggle Buttons Row (No Title Labels) */}
        <div className="menu-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
              className="btn-preset" 
              style={{ flex: 1, padding: '10px 12px', fontSize: '0.9em', fontWeight: 'bold', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className="btn-preset" 
              style={{ flex: 1, padding: '10px 12px', fontSize: '0.9em', fontWeight: 'bold', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            >
              {soundEnabled ? '🔊 Sounds On' : '🔇 Muted'}
            </button>
          </div>
        </div>

        {/* 4. Data & Sharing Category */}
        <div className="menu-section global-actions-menu" style={{ borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
          <label>Data & Sharing</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <button onClick={handleShareList} className="btn-preset share-btn" style={{ width: '100%', padding: '10px', background: 'var(--navy)', color: 'white', fontWeight: 'bold' }}>
              🔗 Share Current Setup Link
            </button>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleExport} className="btn-preset" style={{ flex: 1, padding: '8px 10px', fontSize: '0.9em' }}>
                💾 Export to YAML
              </button>
              <input type="file" accept=".yaml,.yml" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileImport} />
              <button onClick={() => fileInputRef.current?.click()} className="btn-preset" style={{ flex: 1, padding: '8px 10px', fontSize: '0.9em' }}>
                📂 Import from YAML
              </button>
            </div>
          </div>
        </div>

        {/* 5. Minimalist App Installation */}
        {deferredPrompt && (
          <div className="menu-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
            <button 
              onClick={handleInstallClick} 
              className="btn-preset" 
              style={{ width: '100%', padding: '8px', background: 'var(--accent)', color: '#121212', borderColor: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9em' }}
            >
              📱 Install App
            </button>
          </div>
        )}

        {/* 6. Collapsible Action History */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px', marginTop: '10px' }}>
          <details className="history-disclosure">
            <summary style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#888', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📜 View Action History ({past.length})
            </summary>
            <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '10px', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(0,0,0,0.02)' }}>
              {past.length === 0 ? (
                <p className="controls-desc" style={{ margin: 0 }}>No actions taken yet.</p>
              ) : (
                <ul className="history-log" style={{ margin: 0, padding: 0 }}>
                  {[...past].reverse().slice(0, 30).map((entry) => (
                    <li key={entry.id} style={{ fontSize: '0.8em', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', listStyle: 'none' }}>
                      <span className="log-time" style={{ color: '#888', marginRight: '6px' }}>{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                      <span className="log-msg" style={{ color: 'var(--text)' }}>{entry.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>

      </div>
    </div>
  );
};
