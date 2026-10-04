/** The five fields of a standard cron expression, in order. */
export type FieldName = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

export const FIELD_ORDER: readonly FieldName[] = [
  'minute',
  'hour',
  'dayOfMonth',
  'month',
  'dayOfWeek',
];

/**
 * One comma-separated item of a field, as written by the user.
 *
 * - `all`: `*` or `*\/n`
 * - `value`: a single value such as `5` or `MON`
 * - `range`: `a-b` or `a-b/n`
 *
 * `step` is always present and is `1` when no `/n` was written.
 * Values are stored as numbers; day-of-week 7 is kept as written here
 * and normalised to 0 only in {@link CronField.values}.
 */
export type FieldPart =
  | { readonly kind: 'all'; readonly step: number }
  | { readonly kind: 'value'; readonly value: number }
  | { readonly kind: 'range'; readonly start: number; readonly end: number; readonly step: number };

export interface CronField {
  readonly name: FieldName;
  /** The raw text of this field, e.g. `"1-5"`. */
  readonly source: string;
  /** The parsed items, in the order they were written. */
  readonly parts: readonly FieldPart[];
  /** Every value this field matches, sorted ascending and de-duplicated. */
  readonly values: readonly number[];
  /**
   * True when the field begins with `*`. Used for the day-of-month /
   * day-of-week "either matches" rule, mirroring Vixie cron.
   */
  readonly wildcard: boolean;
}

/** A validated, structured cron expression. */
export interface CronExpression {
  /** The original expression, trimmed. */
  readonly source: string;
  readonly minute: CronField;
  readonly hour: CronField;
  readonly dayOfMonth: CronField;
  readonly month: CronField;
  readonly dayOfWeek: CronField;
}
