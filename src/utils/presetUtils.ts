import { parse } from 'yaml';
import type { PackItem, Category } from '../types';

// Dynamically import all .yaml files in the presets directory
const rawPresets = import.meta.glob('../presets/*.yaml', { query: '?raw', eager: true });

export const PRESETS: Record<string, any> = {};

Object.entries(rawPresets).forEach(([path, moduleExport]) => {
  const id = path.split('/').pop()?.replace('.yaml', '') || path;
  // Vite 8 raw imports return a module object with a default export when used with eager: true
  const content = typeof moduleExport === 'string' ? moduleExport : (moduleExport as any).default;
  PRESETS[id] = parse(content);
});

export const getPresetData = (cruiseId: string) => PRESETS[cruiseId] || Object.values(PRESETS)[0];

export const getInitialLuggageAssignments = (cruiseId: string) => {
  const data = getPresetData(cruiseId);
  const assignments: Record<string, string> = {};
  if (data && data.categories) {
    data.categories.forEach((cat: Category) => {
      cat.items.forEach(item => {
        if (item.defaultBag) {
          assignments[item.id] = item.defaultBag;
        } else {
          assignments[item.id] = 'lug_1'; // fallback
        }
      });
    });
  }
  return assignments;
};

export const getPresetCategories = (cruiseId: string, role: 'crew' | 'captain') => {
  const data = getPresetData(cruiseId);
  if (!data || !data.categories) return [];
  const disableRoles = data.disableRoles === true;
  return data.categories.map((cat: Category) => ({
    ...cat,
    items: (role === 'crew' && !disableRoles) ? cat.items.filter((i: PackItem) => !i.captainOnly) : [...cat.items]
  }));
};
