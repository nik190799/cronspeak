import {
  DAY_NAMES,
  MONTH_NAMES,
  parse,
  type CronExpression,
  type CronField,
  type FieldPart,
} from '../core/index.js';

/**
 * Describe a cron expression in plain English.
 *
 * @example
 * describe('30 9 * * 1-5'); // "At 09:30 on Monday through Friday"
 * describe('*\/15 * * * *'); // "Every 15 minutes"
 * @throws {CronParseError} when given a string that is not a valid expression.
 */
export function describe(expr: string | CronExpression): string {
  const cron = typeof expr === 'string' ? parse(expr) : expr;
  return [
    describeTime(cron.minute, cron.hour),
    describeDays(cron.dayOfMonth, cron.dayOfWeek),
    describeMonths(cron.month),
  ]
    .filter((phrase) => phrase !== '')
    .join(' ');
}

/** Largest number of explicit clock times we list before falling back to per-field wording. */
const MAX_LISTED_TIMES = 8;

function describeTime(minute: CronField, hour: CronField): string {
  const minutes = singleValues(minute);
  const hours = singleValues(hour);

  if (minutes && hours && minutes.length * hours.length <= MAX_LISTED_TIMES) {
    const times = hours.flatMap((h) => minutes.map((m) => `${pad(h)}:${pad(m)}`));
    return `At ${joinList(times)}`;
  }

  if (isEvery(minute) && hours) {
    const windows = hours.map((h) => `${pad(h)}:00 through ${pad(h)}:59`);
    return `Every minute from ${joinList(windows)}`;
  }

  const minutePhrase = capitalize(describeMinutes(minute));
  if (isEvery(hour)) {
    return minutes || mixedItems(minute) ? `${minutePhrase} past every hour` : minutePhrase;
  }
  return `${minutePhrase} past ${describeHours(hour)}`;
}

function describeMinutes(field: CronField): string {
  const values = singleValues(field);
  if (values) {
    return `at ${plural('minute', values.length)} ${joinList(values.map(String))}`;
  }
  const items = mixedItems(field);
  if (items) {
    return `at minutes ${joinList(items)}`;
  }
  return joinList(
    field.parts.map((part) => {
      switch (part.kind) {
        case 'all':
          return part.step === 1 ? 'every minute' : `every ${part.step} minutes`;
        case 'value':
          return `at minute ${part.value}`;
        case 'range':
          return part.step === 1
            ? `every minute from ${part.start} through ${part.end}`
            : `every ${part.step} minutes from minute ${part.start} through ${part.end}`;
      }
    }),
  );
}

function describeHours(field: CronField): string {
  const values = singleValues(field);
  if (values) {
    return `${plural('hour', values.length)} ${joinList(values.map(String))}`;
  }
  const items = mixedItems(field);
  if (items) {
    return `hours ${joinList(items)}`;
  }
  return joinList(field.parts.map((part) => describePart(part, 'hour', String)));
}

function describeDays(dayOfMonth: CronField, dayOfWeek: CronField): string {
  const domRestricted = !isEvery(dayOfMonth);
  const dowRestricted = !isEvery(dayOfWeek);
  const dom = domRestricted ? describeDaysOfMonth(dayOfMonth) : '';
  const dow = dowRestricted ? describeDaysOfWeek(dayOfWeek) : '';

  if (domRestricted && dowRestricted) {
    // Standard cron: when both fields are restricted (neither starts with "*"),
    // a day matches if EITHER field matches.
    const connector = !dayOfMonth.wildcard && !dayOfWeek.wildcard ? 'or' : 'and';
    return `${dom} ${connector} ${dow}`;
  }
  return dom || dow;
}

function describeDaysOfMonth(field: CronField): string {
  const values = singleValues(field);
  if (values) {
    return `on ${plural('day', values.length)} ${joinList(values.map(String))} of the month`;
  }
  const items = mixedItems(field);
  if (items) {
    return `on days ${joinList(items)} of the month`;
  }
  return `on ${joinList(field.parts.map((part) => describePart(part, 'day', String)))} of the month`;
}

function describeDaysOfWeek(field: CronField): string {
  const name = (v: number): string => DAY_NAMES[v % 7] as string;
  // 0 and 7 both mean Sunday, so drop repeated phrases (e.g. `0,7` or `SUN,7`).
  const phrases = field.parts.map((part) => describePart(part, 'day of the week', name, 'day'));
  return `on ${joinList([...new Set(phrases)])}`;
}

function describeMonths(field: CronField): string {
  if (isEvery(field)) {
    return '';
  }
  const name = (v: number): string => MONTH_NAMES[v - 1] as string;
  return `in ${joinList(field.parts.map((part) => describePart(part, 'month', name)))}`;
}

/**
 * Generic wording for one list item.
 * `unit` is used for `*\/n`; `rangeUnit` (defaults to `unit`) for `a-b/n`.
 */
function describePart(
  part: FieldPart,
  unit: string,
  format: (value: number) => string,
  rangeUnit: string = unit,
): string {
  switch (part.kind) {
    case 'all':
      return part.step === 1 ? `every ${unit}` : `every ${ordinal(part.step)} ${unit}`;
    case 'value':
      return unit === 'day' || unit === 'hour'
        ? `${unit} ${format(part.value)}`
        : format(part.value);
    case 'range': {
      const span = `${format(part.start)} through ${format(part.end)}`;
      if (part.step !== 1) {
        return `every ${ordinal(part.step)} ${rangeUnit} from ${span}`;
      }
      return unit === 'day' || unit === 'hour' ? `${unit}s ${span}` : span;
    }
  }
}

/** True for a bare `*` (or `*\/1`): the field places no restriction. */
function isEvery(field: CronField): boolean {
  const [first] = field.parts;
  return field.parts.length === 1 && first?.kind === 'all' && first.step === 1;
}

/** The written values when every list item is a single value, otherwise `undefined`. */
function singleValues(field: CronField): number[] | undefined {
  if (!field.parts.every((part) => part.kind === 'value')) {
    return undefined;
  }
  return [...field.values];
}

/**
 * The written items when the list mixes single values with plain (unstepped) ranges,
 * e.g. `1,5-10` gives `['1', '5 through 10']`; otherwise `undefined`.
 */
function mixedItems(field: CronField): string[] | undefined {
  const items: string[] = [];
  let hasValue = false;
  let hasRange = false;
  for (const part of field.parts) {
    if (part.kind === 'value') {
      items.push(String(part.value));
      hasValue = true;
    } else if (part.kind === 'range' && part.step === 1) {
      items.push(`${part.start} through ${part.end}`);
      hasRange = true;
    } else {
      return undefined;
    }
  }
  return hasValue && hasRange ? items : undefined;
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`;
  }
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

function plural(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
