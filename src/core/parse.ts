import { CronParseError } from './errors.js';
import { FIELD_SPECS, type FieldSpec } from './fields.js';
import { FIELD_ORDER, type CronExpression, type CronField, type FieldPart } from './types.js';

const INTEGER = /^\d+$/;

/**
 * Parse a standard 5-field cron expression
 * (`minute hour day-of-month month day-of-week`).
 *
 * @throws {CronParseError} when the expression is malformed or out of range.
 */
export function parse(expr: string): CronExpression {
  if (typeof expr !== 'string') {
    throw new CronParseError('Expression must be a string', String(expr));
  }
  const source = expr.trim();
  if (source === '') {
    throw new CronParseError('Expression is empty', expr);
  }
  const tokens = source.split(/\s+/);
  if (tokens.length !== FIELD_ORDER.length) {
    throw new CronParseError(
      `Expected 5 fields (minute hour day-of-month month day-of-week) but got ${tokens.length}`,
      source,
    );
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = FIELD_ORDER.map((name, i) =>
    parseField(tokens[i] as string, FIELD_SPECS[name], source),
  ) as [CronField, CronField, CronField, CronField, CronField];

  return { source, minute, hour, dayOfMonth, month, dayOfWeek };
}

function parseField(text: string, spec: FieldSpec, expression: string): CronField {
  const fail = (message: string): never => {
    throw new CronParseError(message, expression, spec.name);
  };

  const parts = text.split(',').map((item) => {
    if (item === '') {
      return fail(`empty list item in "${text}"`);
    }
    return parsePart(item, spec, fail);
  });

  const values = new Set<number>();
  for (const part of parts) {
    for (const v of expandPart(part, spec)) {
      // Day-of-week 7 is an alias for Sunday (0).
      values.add(spec.name === 'dayOfWeek' && v === 7 ? 0 : v);
    }
  }

  return {
    name: spec.name,
    source: text,
    parts,
    values: [...values].sort((a, b) => a - b),
    wildcard: text.startsWith('*'),
  };
}

function parsePart(item: string, spec: FieldSpec, fail: (message: string) => never): FieldPart {
  const slash = item.split('/');
  if (slash.length > 2) {
    return fail(`too many "/" in "${item}"`);
  }
  const [base, stepText] = slash as [string, string | undefined];

  let step = 1;
  if (stepText !== undefined) {
    if (!INTEGER.test(stepText)) {
      return fail(`step "${stepText}" must be a positive whole number`);
    }
    step = Number(stepText);
    if (step < 1) {
      return fail(`step must be at least 1, got ${step}`);
    }
  }

  if (base === '*') {
    return { kind: 'all', step };
  }

  const dash = base.split('-');
  if (dash.length === 2) {
    const start = parseValue(dash[0] as string, spec, fail);
    const end = parseValue(dash[1] as string, spec, fail);
    // Only day-of-week ranges may wrap through the end of the week (`FRI-MON`).
    if (start > end && spec.name !== 'dayOfWeek') {
      return fail(`range start ${start} is greater than range end ${end} in "${item}"`);
    }
    return { kind: 'range', start, end, step };
  }
  if (dash.length > 2) {
    return fail(`malformed range "${base}"`);
  }

  const value = parseValue(base, spec, fail);
  if (stepText !== undefined) {
    // `a/n` is shorthand for `a-max/n`. Day-of-week `7/n` stays `7-7` rather than wrapping.
    return { kind: 'range', start: value, end: Math.max(value, fieldEnd(spec)), step };
  }
  return { kind: 'value', value };
}

/** Where `*` and `a/n` stop: the field maximum, or 6 for day-of-week (7 only repeats Sunday). */
function fieldEnd(spec: FieldSpec): number {
  return spec.name === 'dayOfWeek' ? 6 : spec.max;
}

function parseValue(text: string, spec: FieldSpec, fail: (message: string) => never): number {
  if (text === '') {
    return fail('missing value');
  }
  let value: number | undefined;
  if (INTEGER.test(text)) {
    value = Number(text);
  } else if (spec.aliases !== undefined) {
    value = spec.aliases[text.toUpperCase()];
  }
  if (value === undefined) {
    return fail(`"${text}" is not a valid value`);
  }
  if (value < spec.min || value > spec.max) {
    return fail(`${value} is out of range (${spec.min}-${spec.max})`);
  }
  return value;
}

function expandPart(part: FieldPart, spec: FieldSpec): number[] {
  if (part.kind === 'value') {
    return [part.value];
  }
  const start = part.kind === 'all' ? spec.min : part.start;
  const end = part.kind === 'all' ? fieldEnd(spec) : part.end;
  const out: number[] = [];
  if (start > end) {
    // A wrapping day-of-week range: walk the week from `start`, counting the step across the wrap.
    const days = (((end - start) % 7) + 7) % 7;
    for (let offset = 0; offset <= days; offset += part.step) {
      out.push((start + offset) % 7);
    }
    return out;
  }
  for (let v = start; v <= end; v += part.step) {
    out.push(v);
  }
  return out;
}
