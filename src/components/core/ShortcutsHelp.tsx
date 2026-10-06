import React, { useEffect } from 'react';
import { SHORTCUT_GROUPS } from '../../hooks/useListKeyboard';

export const ShortcutsHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    // capture, so these keys close the panel instead of reaching the list
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-card" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-head">
          <h3>Keyboard shortcuts</h3>
          <button className="btn-close-menu" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="shortcuts-intro">Arrows move the highlight, single keys act on it.</p>
        <div className="shortcuts-grid">
          {SHORTCUT_GROUPS.map(group => (
            <section key={group.title}>
              <h4>{group.title}</h4>
              <dl>
                {group.keys.map(([keys, what]) => (
                  <div key={keys} className="shortcut-row">
                    <dt>{keys.split(/\s{2,}/).map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="kbd-sep"> </span>}
                        {part === 'or' ? <span className="kbd-or">or</span> : part.split(' ').map((k, j) => <kbd key={j}>{k}</kbd>)}
                      </React.Fragment>
                    ))}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
