import type { FieldName } from './types.js';

export interface FieldSpec {
  readonly name: FieldName;
  readonly min: number;
  readonly max: number;
  /** Upper-case three-letter names mapped to their numeric value. */
  readonly aliases?: Readonly<Record<string, number>>;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function aliasesFrom(names: readonly string[], offset: number): Record<string, number> {
  const out: Record<string, number> = {};
  names.forEach((name, i) => {
    out[name.slice(0, 3).toUpperCase()] = i + offset;
  });
  return out;
}

export const FIELD_SPECS: Readonly<Record<FieldName, FieldSpec>> = {
  minute: { name: 'minute', min: 0, max: 59 },
  hour: { name: 'hour', min: 0, max: 23 },
  dayOfMonth: { name: 'dayOfMonth', min: 1, max: 31 },
  month: { name: 'month', min: 1, max: 12, aliases: aliasesFrom(MONTH_NAMES, 1) },
  // 0 and 7 both mean Sunday.
  dayOfWeek: { name: 'dayOfWeek', min: 0, max: 7, aliases: aliasesFrom(DAY_NAMES, 0) },
};
