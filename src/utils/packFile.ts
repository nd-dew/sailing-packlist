import { parse, stringify } from 'yaml';
import type { Category, Luggage, PackItem, Warning } from '../types';

/**
 * The packlist file: one YAML format for presets (src/presets/*.yaml) and for packlists exported from
 * the app. Every file says which version of the format it is written in (`schema`).
 *
 * Changing the format later:
 *   1. bump CURRENT_SCHEMA and change the types below to the new shape;
 *   2. add MIGRATIONS[old] that turns a version-`old` document into version `old + 1`;
 *   3. add a sample of the old version to tests/fixtures/ so it stays covered.
 * Files of every older version keep loading: they are upgraded step by step before anything else
 * looks at them. The rest of the app only ever sees the current version.
 */
export const CURRENT_SCHEMA = 1;

export interface PackFileItem {
  id: string;
  name: string;
  qty?: number;
  description?: string;
  bag?: string;            // luggage id; no bag when left out
  captainOnly?: boolean;   // only in the captain's list (unless disableRoles)
  subItems?: { id: string; name: string }[];
}

export interface PackFileCategory {
  id: string;
  title: string;
  priority?: 'must-have' | 'should-have' | 'nice-to-have';
  items: PackFileItem[];
}

export interface PackFile {
  schema: number;
  name: string;
  description?: string;
  showers?: number;        // expected showers: drives underwear / socks / t-shirt counts
  hideShowers?: boolean;
  disableRoles?: boolean;  // one list for everyone, no crew / captain choice
  warnings?: Warning[];
  luggages: Luggage[];
  categories: PackFileCategory[];
  packed?: string[];       // progress: ids of packed items (exported packlists; presets leave it out)
}

// MIGRATIONS[n] upgrades a version-n document to version n + 1. None yet: version 1 is the first.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (doc: any) => any> = {
  // 1: (doc) => ({ ...doc, schema: 2, /* reshape version-1 fields into version 2 here */ }),
};

export class PackFileError extends Error {}

const PRIORITIES = ['must-have', 'should-have', 'nice-to-have'];

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, what: string) => {
  if (typeof v !== 'string' || !v.trim()) throw new PackFileError(`Missing ${what}.`);
  return v;
};
const optStr = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);

// Checks a current-version document and keeps only known fields, so the app can trust its shape
const validate = (doc: Record<string, unknown>): PackFile => {
  const ids = new Set<string>();
  const uniqueId = (v: unknown, what: string) => {
    const id = str(v, what);
    if (ids.has(id)) throw new PackFileError(`The id "${id}" is used twice.`);
    ids.add(id);
    return id;
  };

  if (!Array.isArray(doc.categories)) throw new PackFileError('Missing categories.');
  const luggages = Array.isArray(doc.luggages) ? doc.luggages.filter(isObject).map(l => ({
    id: str(l.id, 'bag id'),
    name: str(l.name, 'bag name'),
    ...(optStr(l.icon) && { icon: optStr(l.icon) }),
    ...(optStr(l.color) && { color: optStr(l.color) }),
    ...(optStr(l.description) && { description: optStr(l.description) }),
  })) : [];
  const bagIds = new Set(luggages.map(l => l.id));

  return {
    schema: CURRENT_SCHEMA,
    name: str(doc.name, 'name'),
    ...(optStr(doc.description) && { description: optStr(doc.description) }),
    ...(typeof doc.showers === 'number' && { showers: doc.showers }),
    ...(doc.hideShowers === true && { hideShowers: true }),
    ...(doc.disableRoles === true && { disableRoles: true }),
    warnings: Array.isArray(doc.warnings)
      ? doc.warnings.filter(isObject).map((w, i) => ({ id: optStr(w.id) ?? `warn_${i + 1}`, text: str(w.text, 'warning text') }))
      : [],
    luggages,
    categories: doc.categories.filter(isObject).map(cat => {
      if (!Array.isArray(cat.items)) throw new PackFileError(`Category "${cat.title}" has no items list.`);
      return {
        id: uniqueId(cat.id, 'category id'),
        title: str(cat.title, 'category title'),
        ...(PRIORITIES.includes(cat.priority as string) && { priority: cat.priority as PackFileCategory['priority'] }),
        items: cat.items.filter(isObject).map(item => ({
          id: uniqueId(item.id, 'item id'),
          name: str(item.name, 'item name'),
          ...(typeof item.qty === 'number' && { qty: item.qty }),
          ...(optStr(item.description) && { description: optStr(item.description) }),
          ...(typeof item.bag === 'string' && bagIds.has(item.bag) && { bag: item.bag }),
          ...(item.captainOnly === true && { captainOnly: true }),
          ...(Array.isArray(item.subItems) && item.subItems.length > 0 && {
            subItems: item.subItems.filter(isObject).map(sub => ({ id: uniqueId(sub.id, 'sub-item id'), name: str(sub.name, 'sub-item name') })),
          }),
        })),
      };
    }),
    ...(Array.isArray(doc.packed) && { packed: doc.packed.filter((id): id is string => typeof id === 'string') }),
  };
};

// Any version in, current version out
export const ingestPackFile = (raw: unknown): PackFile => {
  if (!isObject(raw)) throw new PackFileError('This is not a packlist file.');
  const schema = raw.schema;
  if (typeof schema !== 'number' || !Number.isInteger(schema) || schema < 1) {
    throw new PackFileError('This is not a packlist file (it has no "schema" version).');
  }
  if (schema > CURRENT_SCHEMA) {
    throw new PackFileError(`This packlist was made with a newer version of the app (format ${schema}). Reload the page to update, then try again.`);
  }
  let doc: Record<string, unknown> = raw;
  while ((doc.schema as number) < CURRENT_SCHEMA) {
    const upgrade = MIGRATIONS[doc.schema as number];
    if (!upgrade) throw new PackFileError(`Format ${doc.schema} can't be read any more.`);
    doc = upgrade(doc);
  }
  return validate(doc);
};

export const parsePackFile = (yamlText: string): PackFile => {
  let raw: unknown;
  try {
    raw = parse(yamlText);
  } catch {
    throw new PackFileError("This file can't be read: it isn't valid YAML.");
  }
  return ingestPackFile(raw);
};

/** A packlist file as the app's in-memory list: categories without bags, plus a bag map and progress */
export const packFileToList = (file: PackFile, role: 'crew' | 'captain' = 'crew') => {
  const keep = (item: PackFileItem) => role === 'captain' || file.disableRoles || !item.captainOnly;
  const itemLuggage: Record<string, string> = {};
  const categories: Category[] = file.categories.map(cat => ({
    id: cat.id,
    title: cat.title,
    ...(cat.priority && { priority: cat.priority }),
    items: cat.items.filter(keep).map(({ bag, ...item }): PackItem => {
      if (bag) itemLuggage[item.id] = bag;
      return item;
    }),
  }));
  const checkedItems: Record<string, boolean> = {};
  file.packed?.forEach(id => { checkedItems[id] = true; });
  return { categories, itemLuggage, checkedItems, warnings: file.warnings ?? [], luggages: file.luggages, showers: file.showers };
};

/** The other way around: what Export writes (progress included; presets just ignore it) */
export const listToPackFile = (list: {
  name: string;
  description?: string;
  showers: number;
  hideShowers?: boolean;
  warnings: Warning[];
  luggages: Luggage[];
  categories: Category[];
  itemLuggage: Record<string, string>;
  checkedItems: Record<string, boolean>;
}): PackFile => {
  const packed: string[] = [];
  const categories: PackFileCategory[] = list.categories.map(cat => ({
    id: cat.id,
    title: cat.title,
    ...(cat.priority && { priority: cat.priority }),
    items: cat.items.map(item => {
      const ids = item.subItems?.length ? item.subItems.map(s => s.id) : [item.id];
      ids.forEach(id => { if (list.checkedItems[id]) packed.push(id); });
      return {
        id: item.id,
        name: item.name,
        ...(item.qty && { qty: item.qty }),
        ...(item.description && { description: item.description }),
        ...(list.itemLuggage[item.id] && { bag: list.itemLuggage[item.id] }),
        ...(item.subItems?.length && { subItems: item.subItems.map(s => ({ id: s.id, name: s.name })) }),
      };
    }),
  }));
  return {
    schema: CURRENT_SCHEMA,
    name: list.name,
    ...(list.description && { description: list.description }),
    showers: list.showers,
    ...(list.hideShowers && { hideShowers: true }),
    // crew / captain filtering already happened when the list was made
    disableRoles: true,
    ...(list.warnings.length > 0 && { warnings: list.warnings }),
    luggages: list.luggages,
    categories,
    ...(packed.length > 0 && { packed }),
  };
};

export const stringifyPackFile = (file: PackFile) => stringify(file, { lineWidth: 0 });
