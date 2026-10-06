// The active preset lives in the URL path: <base>/<presetId>, e.g. /sailing-packlist/cyprus_october
const BASE = import.meta.env.BASE_URL; // always ends with '/'

export const getPresetIdFromPath = (): string | null => {
  const { pathname } = window.location;
  if (!pathname.startsWith(BASE)) return null;
  const id = decodeURIComponent(pathname.slice(BASE.length).replace(/\/+$/, ''));
  return id || null;
};

export const getPresetUrl = (presetId: string) => `${window.location.origin}${BASE}${encodeURIComponent(presetId)}`;

/** Point the address bar at the given preset without adding a history entry (keeps any hash). */
export const replacePresetPath = (presetId: string) => {
  const target = `${BASE}${encodeURIComponent(presetId)}`;
  if (window.location.pathname !== target) {
    window.history.replaceState(null, '', target + window.location.search + window.location.hash);
  }
};

export const clearUrlHash = () => {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
};
