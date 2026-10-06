import { stringify } from 'yaml';
import type { Category, Luggage, PackItem, Warning } from '../types';
import type { SharedPayload } from './shareUtils';
import { PRESETS, getPresetData, getPresetCategories, getInitialLuggageAssignments } from './presetUtils';

// A trip is one packing list of your own. Each one keeps its own items, bags and packing progress.
export interface TripMeta {
  id: string;
  name: string;
  presetId: string | null; // the preset it started from, if any
  createdAt: number;
  sourceToken?: string;    // share link it was opened from, so opening that link again reuses it
}

export interface TripData {
  categories: Category[];
  warnings: Warning[];
  checkedItems: Record<string, boolean>;
  luggages: Luggage[];
  itemLuggage: Record<string, string>;
  changes: number;         // expected showers
  description: string;     // trip notes ('' falls back to the preset description)
}

export interface TripIndex {
  activeTripId: string;
  trips: TripMeta[];
}

const INDEX_KEY = 'sailingPacklist_trips_v1';
const dataKey = (id: string) => `sailingPacklist_trip_${id}`;

export const newTripId = () => `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
};

export const saveTripIndex = (index: TripIndex) => localStorage.setItem(INDEX_KEY, JSON.stringify(index));
export const loadTripData = (id: string) => readJson<TripData>(dataKey(id));
export const saveTripData = (id: string, data: TripData) => localStorage.setItem(dataKey(id), JSON.stringify(data));
export const removeTripData = (id: string) => localStorage.removeItem(dataKey(id));

export const buildPresetTripData = (presetId: string, role: 'crew' | 'captain'): TripData => {
  const preset = getPresetData(presetId);
  return {
    categories: getPresetCategories(presetId, role),
    warnings: preset.warnings || [],
    checkedItems: {},
    luggages: preset.luggages || [],
    itemLuggage: getInitialLuggageAssignments(presetId),
    changes: preset.showers || 1,
    description: '',
  };
};

// An empty list still gets a set of bags, so the bag chips work from the first item on
export const buildEmptyTripData = (defaultPresetId: string): TripData => ({
  categories: [],
  warnings: [],
  checkedItems: {},
  luggages: getPresetData(defaultPresetId).luggages || [],
  itemLuggage: {},
  changes: 3,
  description: '',
});

export const buildSharedTripData = (shared: SharedPayload, defaultPresetId: string): TripData => {
  const luggages: Luggage[] = shared.lugs.map(lug => ({ id: lug.id, name: lug.name, icon: lug.icon, color: lug.color }));
  const basePresetId = shared.p || defaultPresetId;
  const baseData = getPresetData(basePresetId);
  const baseCategories = getPresetCategories(basePresetId, 'crew');
  const presetItems: PackItem[] = baseData.categories.flatMap((cat: Category) => cat.items);

  const itemLuggage: Record<string, string> = {};
  const excludedItemIds = new Set<string>();
  shared.l.forEach((bagIndex, itemIndex) => {
    const presetItem = presetItems[itemIndex];
    if (!presetItem) return;
    if (bagIndex === -2) excludedItemIds.add(presetItem.id);
    else if (bagIndex >= 0 && bagIndex < luggages.length) itemLuggage[presetItem.id] = luggages[bagIndex].id;
  });

  const categories: Category[] = [];
  shared.cats.forEach(catRef => {
    if (typeof catRef === 'string') {
      const baseCat = baseCategories.find((c: Category) => c.id === catRef);
      if (baseCat) categories.push({ ...baseCat, items: baseCat.items.filter((item: PackItem) => !excludedItemIds.has(item.id)) });
    } else {
      categories.push({ id: catRef.id, title: catRef.title, priority: catRef.priority as Category['priority'], items: [] });
    }
  });

  shared.c?.forEach(custom => {
    const targetCat = categories.find(c => c.id === custom.cat)
      ?? categories.find(c => c.title.toLowerCase().includes(custom.cat.toLowerCase()));
    if (!targetCat) return;
    const customId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    targetCat.items.push({ id: customId, name: custom.n, qty: 1 });
    if (custom.b >= 0 && custom.b < luggages.length) itemLuggage[customId] = luggages[custom.b].id;
  });

  return {
    categories,
    warnings: baseData.warnings || [],
    checkedItems: {},
    luggages,
    itemLuggage,
    changes: baseData.showers || 3,
    description: shared.d || '',
  };
};

// Before trips existed there was a single list stored under separate keys; it becomes the first trip
const migrateLegacyList = (defaultPresetId: string): { meta: TripMeta; data: TripData } => {
  const presetId = localStorage.getItem('sailingPacklist_activePresetId_v16') || defaultPresetId;
  const fresh = buildPresetTripData(presetId, 'crew');
  const showers = localStorage.getItem('sailingPacklist_showers_v16');
  const luggages = (readJson<Luggage[]>('sailingPacklist_luggages_v16') ?? fresh.luggages).map(lug => {
    // old emoji icons became string ids
    if (lug.icon === '🧳') return { ...lug, icon: 'duffel' };
    if (lug.icon === '🎒') return { ...lug, icon: 'backpack' };
    if (lug.icon === '🧍') return { ...lug, icon: 'on_person' };
    return lug;
  });
  const data: TripData = {
    categories: readJson<Category[]>('sailingPacklist_structure_v16') ?? fresh.categories,
    warnings: readJson<Warning[]>('sailingPacklist_warnings_v16') ?? fresh.warnings,
    checkedItems: readJson<Record<string, boolean>>('sailingPacklist_checked_v16') ?? {},
    luggages,
    itemLuggage: readJson<Record<string, string>>('sailingPacklist_itemLuggage_v16') ?? fresh.itemLuggage,
    changes: showers ? parseInt(showers) : fresh.changes,
    description: localStorage.getItem('sailingPacklist_cruiseDescription_v16') ?? '',
  };
  const meta: TripMeta = {
    id: newTripId(),
    name: PRESETS[presetId]?.name || 'My trip',
    presetId: PRESETS[presetId] ? presetId : null,
    createdAt: Date.now(),
  };
  return { meta, data };
};

export const loadInitialTrips = (defaultPresetId: string): { index: TripIndex; data: TripData } => {
  const index = readJson<TripIndex>(INDEX_KEY);
  if (index && index.trips.length > 0) {
    const active = index.trips.find(t => t.id === index.activeTripId) ?? index.trips[index.trips.length - 1];
    const data = loadTripData(active.id)
      ?? (active.presetId ? buildPresetTripData(active.presetId, 'crew') : buildEmptyTripData(defaultPresetId));
    return { index: { activeTripId: active.id, trips: index.trips }, data };
  }
  const { meta, data } = migrateLegacyList(defaultPresetId);
  const fresh = { activeTripId: meta.id, trips: [meta] };
  saveTripIndex(fresh);
  saveTripData(meta.id, data);
  return { index: fresh, data };
};

export const uniqueTripName = (base: string, trips: TripMeta[]) => {
  const names = new Set(trips.map(t => t.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} (${n})`)) n++;
  return `${base} (${n})`;
};

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '_') || 'my_trip';

// A trip written in the preset file format, ready to drop into src/presets/
export const tripToPresetYaml = (meta: TripMeta, data: TripData) => {
  const id = slugify(meta.name);
  const basePreset = meta.presetId ? PRESETS[meta.presetId] : undefined;
  const preset = {
    id,
    name: meta.name,
    description: data.description || basePreset?.description || '',
    showers: data.changes,
    hideShowers: basePreset?.hideShowers || undefined,
    // crew/captain filtering already happened when the trip was created
    disableRoles: true,
    warnings: data.warnings.length ? data.warnings : undefined,
    luggages: data.luggages,
    categories: data.categories.map(cat => ({
      id: cat.id,
      title: cat.title,
      priority: cat.priority,
      items: cat.items.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        description: item.description || undefined,
        defaultBag: data.itemLuggage[item.id],
        subItems: item.subItems?.length ? item.subItems.map(sub => ({ id: sub.id, name: sub.name })) : undefined,
      })),
    })),
  };
  return { fileName: `${id}.yaml`, yaml: stringify(preset) };
};
