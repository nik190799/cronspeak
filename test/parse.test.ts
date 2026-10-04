import { describe, expect, it } from 'vitest';
import { CronParseError, parse } from '../src/index.js';

function parseError(expr: string): CronParseError {
  try {
    parse(expr);
  } catch (error) {
    if (error instanceof CronParseError) {
      return error;
    }
    throw error;
  }
  throw new Error(`Expected "${expr}" to fail to parse`);
}

describe('parse', () => {
  it('parses wildcards into the full range', () => {
    const cron = parse('* * * * *');
    expect(cron.minute.values).toHaveLength(60);
    expect(cron.hour.values).toHaveLength(24);
    expect(cron.dayOfMonth.values[0]).toBe(1);
    expect(cron.dayOfMonth.values).toHaveLength(31);
    expect(cron.month.values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(cron.dayOfWeek.values).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(cron.minute.wildcard).toBe(true);
  });

  it('parses single numbers', () => {
    const cron = parse('30 9 15 6 3');
    expect(cron.minute.values).toEqual([30]);
    expect(cron.hour.values).toEqual([9]);
    expect(cron.dayOfMonth.values).toEqual([15]);
    expect(cron.month.values).toEqual([6]);
    expect(cron.dayOfWeek.values).toEqual([3]);
    expect(cron.minute.wildcard).toBe(false);
  });

  it('parses ranges', () => {
    expect(parse('0 9-17 * * *').hour.values).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('parses lists and sorts and de-duplicates values', () => {
    expect(parse('30,0,15,0 * * * *').minute.values).toEqual([0, 15, 30]);
  });

  it('parses */n steps', () => {
    expect(parse('*/15 * * * *').minute.values).toEqual([0, 15, 30, 45]);
  });

  it('parses a-b/n steps', () => {
    expect(parse('0 8-18/4 * * *').hour.values).toEqual([8, 12, 16]);
  });

  it('keeps the written parts for each field', () => {
    expect(parse('1,5-10/2,*/20 * * * *').minute.parts).toEqual([
      { kind: 'value', value: 1 },
      { kind: 'range', start: 5, end: 10, step: 2 },
      { kind: 'all', step: 20 },
    ]);
  });

  it('accepts month names case-insensitively', () => {
    expect(parse('0 0 1 jan,Jun,DEC *').month.values).toEqual([1, 6, 12]);
    expect(parse('0 0 1 MAR-may *').month.values).toEqual([3, 4, 5]);
  });

  it('accepts day names case-insensitively', () => {
    expect(parse('0 0 * * mon-FRI').dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    expect(parse('0 0 * * Sun,sat').dayOfWeek.values).toEqual([0, 6]);
  });

  it('treats day-of-week 7 as Sunday', () => {
    expect(parse('0 0 * * 7').dayOfWeek.values).toEqual([0]);
    expect(parse('0 0 * * 5-7').dayOfWeek.values).toEqual([0, 5, 6]);
  });

  it('tolerates surrounding and repeated whitespace', () => {
    const cron = parse('  0   9 *\t* 1-5 ');
    expect(cron.source).toBe('0   9 *\t* 1-5');
    expect(cron.hour.values).toEqual([9]);
  });

  it('rejects an empty expression', () => {
    expect(parseError('   ').message).toMatch(/empty/);
  });

  it('rejects the wrong number of fields', () => {
    const error = parseError('* * * *');
    expect(error.message).toMatch(/Expected 5 fields .* got 4/);
    expect(error.field).toBeUndefined();
    expect(parseError('0 * * * * *').message).toMatch(/got 6/);
  });

  it('reports the field name for out-of-range values', () => {
    const error = parseError('60 * * * *');
    expect(error).toBeInstanceOf(CronParseError);
    expect(error.field).toBe('minute');
    expect(error.message).toBe('Invalid minute field: 60 is out of range (0-59)');
    expect(error.expression).toBe('60 * * * *');
  });

  it.each([
    ['* 24 * * *', 'hour'],
    ['* * 0 * *', 'dayOfMonth'],
    ['* * 32 * *', 'dayOfMonth'],
    ['* * * 13 *', 'month'],
    ['* * * * 8', 'dayOfWeek'],
  ] as const)('rejects out-of-range value in "%s"', (expr, field) => {
    expect(parseError(expr).field).toBe(field);
  });

  it('rejects unknown names', () => {
    const error = parseError('0 0 * FOO *');
    expect(error.field).toBe('month');
    expect(error.message).toMatch(/"FOO" is not a valid value/);
  });

  it('rejects names in fields that do not support them', () => {
    expect(parseError('MON * * * *').field).toBe('minute');
  });

  it('rejects reversed ranges', () => {
    expect(parseError('0 17-9 * * *').message).toMatch(
      /range start 17 is greater than range end 9/,
    );
  });

  it('rejects zero and non-numeric steps', () => {
    expect(parseError('*/0 * * * *').message).toMatch(/step must be at least 1/);
    expect(parseError('*/x * * * *').message).toMatch(/positive whole number/);
  });

  it('rejects empty list items and malformed ranges', () => {
    expect(parseError('1,,2 * * * *').message).toMatch(/empty list item/);
    expect(parseError('1-2-3 * * * *').message).toMatch(/malformed range/);
    expect(parseError('1- * * * *').message).toMatch(/missing value/);
  });

  it('rejects negative numbers and decimals', () => {
    expect(parseError('-1 * * * *').field).toBe('minute');
    expect(parseError('1.5 * * * *').field).toBe('minute');
  });
});
