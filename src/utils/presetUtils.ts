import { parse } from 'yaml';
import type { PackItem, Category } from '../types';

// Dynamically import all .yaml files in the presets directory
const rawPresets = import.meta.glob('../presets/*.yaml', { as: 'raw', eager: true });

export const PRESETS: Record<string, any> = {};

Object.entries(rawPresets).forEach(([path, content]) => {
  const id = path.split('/').pop()?.replace('.yaml', '') || path;
  PRESETS[id] = parse(content as string);
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
  return data.categories.map((cat: Category) => ({
    ...cat,
    items: role === 'crew' ? cat.items.filter((i: PackItem) => !i.captainOnly) : [...cat.items]
  }));
};
