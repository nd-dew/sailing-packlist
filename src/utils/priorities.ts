import type { Category } from '../types';

export type Priority = NonNullable<Category['priority']>;

export const PRIORITIES: { value: Priority; stars: string; label: string }[] = [
  { value: 'must-have', stars: '★★★', label: 'Must have' },
  { value: 'should-have', stars: '★★☆', label: 'Should have' },
  { value: 'nice-to-have', stars: '★☆☆', label: 'Nice to have' },
];
