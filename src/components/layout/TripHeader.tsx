import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePacklist } from '../../context/PacklistContext';
import { PRESETS } from '../../utils/presetUtils';
import { compressPayload } from '../../utils/shareUtils';
import { countLeafItems } from '../../utils/countUtils';
import { loadTripData, type TripMeta } from '../../utils/tripStore';

// The trip as the page title: the title opens the trips menu, the line under it holds the trip notes
export const TripHeader: React.FC = () => {
  const {
    activePresetId, activeTrip, trips, switchTrip, createTripFromPreset, createEmptyTrip, renameTrip, deleteTrip,
    cruiseDescription, setCruiseDescription, playPopSound, triggerConfirm, getSharePayload, exportActiveTripAsPreset,
    categories, checkedItems
  } = usePacklist();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const tripName = activeTrip?.name || 'My packlist';
  const notes = cruiseDescription || PRESETS[activePresetId]?.description || '';
  const newestFirst = [...trips].reverse();

  // "12/38 packed", plus where it came from when the name no longer says so
  const describeTrip = (trip: TripMeta) => {
    const data = trip.id === activeTrip.id ? { categories, checkedItems } : loadTripData(trip.id);
    const { packed, total } = data ? countLeafItems(data.categories.flatMap(c => c.items), data.checkedItems) : { packed: 0, total: 0 };
    const presetName = trip.presetId ? PRESETS[trip.presetId]?.name : undefined;
    const origin = presetName && !trip.name.startsWith(presetName) ? ` · from ${presetName}` : '';
    return `${total ? `${packed}/${total} packed` : 'No items yet'}${origin}`;
  };

  // Close the menu on a tap outside or Escape (the delete confirmation toast doesn't count as outside)
  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (rootRef.current?.contains(target) || target.closest('.confirm-toast-overlay')) return;
      setIsMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  useLayoutEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [notes, isEditingNotes]);

  const run = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  const startEmptyTrip = () => run(() => {
    createEmptyTrip();
    setIsRenaming(true); // a blank packlist needs a name first
  });

  const finishRename = (value: string) => {
    if (!value.trim()) renameTrip(activeTrip.id, 'Untitled packlist');
    setIsRenaming(false);
  };

  const handleShare = () => run(async () => {
    playPopSound('click');
    try {
      const token = await compressPayload(getSharePayload());
      await navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}#s=${token}`);
      triggerConfirm(`📋 Link to "${tripName}" copied, send it to your crew`, '', () => {});
    } catch (err) {
      console.error('Failed to generate share link:', err);
      alert('Failed to generate share link.');
    }
  });

  const handleExportPreset = () => run(() => {
    const { fileName, yaml } = exportActiveTripAsPreset();
    const url = URL.createObjectURL(new Blob([yaml], { type: 'text/yaml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Deleting asks for a second tap; the menu stays open for it
  const handleDelete = () => triggerConfirm(`Tap again to delete "${tripName}"`, `delete_trip_${activeTrip.id}`, () => {
    setIsMenuOpen(false);
    deleteTrip(activeTrip.id);
  });

  return (
    <section ref={rootRef} className="trip-header">
      <div className="trip-title-wrap">
        {isRenaming ? (
          <input
            className="trip-title trip-title-input"
            autoFocus
            value={activeTrip.name}
            onChange={(e) => renameTrip(activeTrip.id, e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => finishRename(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
            placeholder="Packlist name"
            aria-label="Packlist name"
          />
        ) : (
          <button
            className="trip-title"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            title="Your packlists"
            data-shortcut="t"
          >
            <span className="trip-title-text">{tripName}</span>
            <svg className="trip-title-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}

        {isMenuOpen && (
          <div className="trip-menu" role="menu" aria-label="Packlists">
            <div className="trip-menu-section">
            <div className="trip-menu-label">My packlists</div>
            {newestFirst.map(trip => {
              const isActive = trip.id === activeTrip.id;
              const row = (
                <button
                  key={trip.id}
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={`trip-menu-option trip-option ${isActive ? 'active' : ''}`}
                  onClick={() => run(() => switchTrip(trip.id))}
                >
                  <span className="trip-menu-check" aria-hidden="true">{isActive ? '✓' : ''}</span>
                  <span className="trip-menu-text">
                    <span className="trip-menu-name">{trip.name}</span>
                    <span className="trip-menu-desc">{describeTrip(trip)}</span>
                  </span>
                </button>
              );
              if (!isActive) return row;
              // The open trip carries its own actions, so it's clear what they apply to
              return (
                <div key={trip.id} className="trip-active-card">
                  {row}
                  <div className="trip-actions" aria-label={`Actions for ${trip.name}`}>
                    <button role="menuitem" className="trip-action" onClick={() => run(() => setIsRenaming(true))}>✎ Rename</button>
                    <button role="menuitem" className="trip-action" onClick={handleShare} title="Copy a link that recreates this packlist">🔗 Share</button>
                    <button role="menuitem" className="trip-action" onClick={handleExportPreset} title="Download this packlist as a preset file (YAML)">⬇ Export</button>
                    <button role="menuitem" className="trip-action danger" onClick={handleDelete}>🗑 Delete</button>
                  </div>
                </div>
              );
            })}

            </div>

            <div className="trip-menu-divider" />
            <div className="trip-menu-section trip-menu-new">
            <div className="trip-menu-label">New packlist</div>
            <button role="menuitem" className="trip-menu-option new-empty-option" onClick={startEmptyTrip}>
              <span className="trip-menu-check" aria-hidden="true">+</span>
              <span className="trip-menu-text">
                <span className="trip-menu-name">Empty packlist</span>
                <span className="trip-menu-desc">Start from scratch</span>
              </span>
            </button>
            <div className="trip-menu-sublabel">or start from a preset</div>
            {Object.entries(PRESETS).map(([id, data]) => {
              const needsRole = !data.disableRoles;
              return (
                <div key={id} className="trip-menu-option preset-option" role="none">
                  <button
                    role="menuitem"
                    className="preset-option-main"
                    onClick={() => run(() => createTripFromPreset(id, 'crew'))}
                    title={needsRole ? 'Start from this preset (crew list)' : 'Start from this preset'}
                  >
                    <span className="trip-menu-check" aria-hidden="true" />
                    <span className="trip-menu-text">
                      <span className="trip-menu-name">{data.name || id}</span>
                      {data.description && <span className="trip-menu-desc">{data.description}</span>}
                    </span>
                  </button>
                  {needsRole && (
                    <span className="role-pills">
                      <button role="menuitem" className="role-pill" onClick={() => run(() => createTripFromPreset(id, 'crew'))}>Crew</button>
                      <button role="menuitem" className="role-pill" onClick={() => run(() => createTripFromPreset(id, 'captain'))}>Captain</button>
                    </span>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {isEditingNotes ? (
        <textarea
          ref={notesRef}
          className="trip-notes-input"
          rows={1}
          autoFocus
          value={notes}
          onChange={(e) => setCruiseDescription(e.target.value)}
          onBlur={() => setIsEditingNotes(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); }}
          placeholder="Notes: dates, boat, meeting point…"
          aria-label="Notes"
        />
      ) : (
        <p
          className={`trip-notes ${notes ? '' : 'is-empty'}`}
          role="button"
          tabIndex={0}
          onClick={() => setIsEditingNotes(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setIsEditingNotes(true); } }}
          title="Edit notes"
        >
          {notes || 'Add notes…'}
        </p>
      )}
    </section>
  );
};
