export type ItemViewFilter = 'all' | 'unpacked' | 'packed';

export interface PackItem {
  id: string;
  name: string;
  description?: string;
  qty?: number;
  captainOnly?: boolean;
  defaultBag?: string;
  subItems?: PackItem[];
}

export interface Category {
  id: string;
  title: string;
  priority?: 'must-have' | 'should-have' | 'nice-to-have';
  items: PackItem[];
}

export interface Warning {
  id: string;
  text: string;
}

export interface Luggage {
  id: string;
  name: string;
  description?: string;
}

export interface AppSnapshot {
  changes: number;
  categories: Category[];
  warnings: Warning[];
  checkedItems: Record<string, boolean>;
  hiddenItems: Record<string, boolean>;
  luggages: Luggage[];
  itemLuggage: Record<string, string>;
}

export interface HistoryEntry {
  id: string;
  message: string;
  timestamp: number;
  snapshot: AppSnapshot;
}
