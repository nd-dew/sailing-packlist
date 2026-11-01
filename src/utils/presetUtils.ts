import { parsePackFile, packFileToList, type PackFile } from './packFile';

// Every .yaml file in src/presets is a preset, named after its file. They are packlist files, read
// (and upgraded, if written in an older format version) the same way as an imported packlist.
const rawPresets = import.meta.glob('../presets/*.yaml', { query: '?raw', eager: true });

export const PRESETS: Record<string, PackFile> = {};

Object.entries(rawPresets).forEach(([path, moduleExport]) => {
  const id = path.split('/').pop()?.replace('.yaml', '') || path;
  // Vite raw imports return a module object with a default export when used with eager: true
  const content = typeof moduleExport === 'string' ? moduleExport : (moduleExport as { default: string }).default;
  try {
    PRESETS[id] = parsePackFile(content);
  } catch (err) {
    console.error(`Preset ${id} can't be loaded:`, err instanceof Error ? err.message : err);
  }
});

export const getPresetData = (cruiseId: string): PackFile => PRESETS[cruiseId] || Object.values(PRESETS)[0];

export const getInitialLuggageAssignments = (cruiseId: string) =>
  packFileToList(getPresetData(cruiseId), 'captain').itemLuggage;

export const getPresetCategories = (cruiseId: string, role: 'crew' | 'captain') =>
  packFileToList(getPresetData(cruiseId), role).categories;
