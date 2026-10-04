import { describe, expect, it } from 'vitest';
import { CronParseError, nextRuns, parse } from '../src/index.js';

const iso = (dates: Date[]): string[] => dates.map((d) => d.toISOString());

describe('nextRuns', () => {
  it('returns the next minutes for "* * * * *", strictly after from', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(iso(nextRuns('* * * * *', from, 3))).toEqual([
      '2026-01-01T00:01:00.000Z',
      '2026-01-01T00:02:00.000Z',
      '2026-01-01T00:03:00.000Z',
    ]);
  });

  it('rounds up from a time with seconds', () => {
    const from = new Date('2026-01-01T10:14:59.999Z');
    expect(iso(nextRuns('*/15 * * * *', from, 2))).toEqual([
      '2026-01-01T10:15:00.000Z',
      '2026-01-01T10:30:00.000Z',
    ]);
  });

  it('skips weekends for a weekday schedule', () => {
    // 2026-01-02 is a Friday.
    const from = new Date('2026-01-02T10:00:00Z');
    expect(iso(nextRuns('30 9 * * 1-5', from, 2))).toEqual([
      '2026-01-05T09:30:00.000Z',
      '2026-01-06T09:30:00.000Z',
    ]);
  });

  it('rolls over month and year boundaries', () => {
    const from = new Date('2026-12-15T00:00:00Z');
    expect(iso(nextRuns('0 0 1 * *', from, 2))).toEqual([
      '2027-01-01T00:00:00.000Z',
      '2027-02-01T00:00:00.000Z',
    ]);
  });

  it('matches either day field when both are restricted', () => {
    // Day 13 of the month OR any Friday. 2026-02-06 and 2026-02-13 are Fridays.
    const from = new Date('2026-02-01T00:00:00Z');
    expect(iso(nextRuns('0 0 13 * 5', from, 3))).toEqual([
      '2026-02-06T00:00:00.000Z',
      '2026-02-13T00:00:00.000Z',
      '2026-02-20T00:00:00.000Z',
    ]);
  });

  it('requires both day fields when day-of-week is "*"', () => {
    const from = new Date('2026-02-01T00:00:00Z');
    expect(iso(nextRuns('0 0 13 * *', from, 2))).toEqual([
      '2026-02-13T00:00:00.000Z',
      '2026-03-13T00:00:00.000Z',
    ]);
  });

  it('finds February 29 in the next leap year', () => {
    const from = new Date('2026-03-01T00:00:00Z');
    expect(iso(nextRuns('0 12 29 2 *', from, 1))).toEqual(['2028-02-29T12:00:00.000Z']);
  });

  it('returns an empty list for a schedule that can never fire', () => {
    expect(nextRuns('0 0 30 2 *', new Date('2026-01-01T00:00:00Z'), 3)).toEqual([]);
  });

  it('respects month names and day-of-week 7', () => {
    // First Sundays in March 2026: the 1st and the 8th.
    const from = new Date('2026-01-01T00:00:00Z');
    expect(iso(nextRuns('0 6 * MAR 7', from, 2))).toEqual([
      '2026-03-01T06:00:00.000Z',
      '2026-03-08T06:00:00.000Z',
    ]);
  });

  it('accepts a pre-parsed expression and count 0', () => {
    expect(nextRuns(parse('0 * * * *'), new Date(), 0)).toEqual([]);
  });

  it('does not mutate the from date', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    nextRuns('0 0 * * *', from, 2);
    expect(from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('validates its arguments', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(() => nextRuns('* * * * *', new Date('invalid'), 1)).toThrow(RangeError);
    expect(() => nextRuns('* * * * *', from, -1)).toThrow(RangeError);
    expect(() => nextRuns('* * * * *', from, 1.5)).toThrow(RangeError);
    expect(() => nextRuns('* * *', from, 1)).toThrow(CronParseError);
  });
});
