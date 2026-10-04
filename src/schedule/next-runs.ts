import { parse, type CronExpression, type CronField } from '../core/index.js';

const MINUTE_MS = 60_000;

/**
 * How far ahead `nextRuns` searches before giving up. Some valid expressions
 * never fire (e.g. `0 0 30 2 *`), so the search must be bounded. Eight years
 * covers every leap-year/weekday combination.
 */
const SEARCH_LIMIT_MS = 8 * 366 * 24 * 60 * MINUTE_MS;

/**
 * Compute the next `count` times the expression fires strictly after `from`.
 * All calculations are in UTC.
 *
 * If the expression can never fire within the search window, fewer than
 * `count` dates (possibly none) are returned.
 *
 * @throws {CronParseError} when given a string that is not a valid expression.
 * @throws {RangeError} when `from` is an invalid date or `count` is not a non-negative integer.
 */
export function nextRuns(expr: string | CronExpression, from: Date, count: number): Date[] {
  const cron = typeof expr === 'string' ? parse(expr) : expr;
  if (!(from instanceof Date) || Number.isNaN(from.getTime())) {
    throw new RangeError('nextRuns: "from" must be a valid Date');
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`nextRuns: "count" must be a non-negative integer, got ${count}`);
  }

  const matcher = createMatcher(cron);
  const results: Date[] = [];
  const limit = from.getTime() + SEARCH_LIMIT_MS;

  // Start at the first whole minute strictly after `from`.
  const cursor = new Date(Math.floor(from.getTime() / MINUTE_MS) * MINUTE_MS + MINUTE_MS);

  while (results.length < count && cursor.getTime() <= limit) {
    if (!matcher.month(cursor.getUTCMonth() + 1)) {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!matcher.day(cursor)) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!matcher.hour(cursor.getUTCHours())) {
      cursor.setUTCHours(cursor.getUTCHours() + 1, 0, 0, 0);
      continue;
    }
    if (!matcher.minute(cursor.getUTCMinutes())) {
      cursor.setTime(cursor.getTime() + MINUTE_MS);
      continue;
    }
    results.push(new Date(cursor.getTime()));
    cursor.setTime(cursor.getTime() + MINUTE_MS);
  }

  return results;
}

interface Matcher {
  minute(value: number): boolean;
  hour(value: number): boolean;
  month(value: number): boolean;
  day(date: Date): boolean;
}

function createMatcher(cron: CronExpression): Matcher {
  const minute = toSet(cron.minute);
  const hour = toSet(cron.hour);
  const month = toSet(cron.month);
  const dayOfMonth = toSet(cron.dayOfMonth);
  const dayOfWeek = toSet(cron.dayOfWeek);
  // Standard cron rule: if both day fields are restricted, either may match.
  const either = !cron.dayOfMonth.wildcard && !cron.dayOfWeek.wildcard;

  return {
    minute: (v) => minute.has(v),
    hour: (v) => hour.has(v),
    month: (v) => month.has(v),
    day: (date) => {
      const domMatch = dayOfMonth.has(date.getUTCDate());
      const dowMatch = dayOfWeek.has(date.getUTCDay());
      return either ? domMatch || dowMatch : domMatch && dowMatch;
    },
  };
}

function toSet(field: CronField): ReadonlySet<number> {
  return new Set(field.values);
}
