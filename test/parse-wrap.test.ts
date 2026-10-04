import { describe as group, expect, it } from 'vitest';
import { CronParseError, describe, nextRuns, parse } from '../src/index.js';

const iso = (dates: Date[]): string[] => dates.map((d) => d.toISOString());

group('wrap-around day-of-week ranges', () => {
  it('wraps FRI-MON through the end of the week', () => {
    expect(parse('0 0 * * FRI-MON').dayOfWeek.values).toEqual([0, 1, 5, 6]);
  });

  it('wraps numeric ranges the same way', () => {
    expect(parse('0 0 * * 5-1').dayOfWeek.values).toEqual([0, 1, 5, 6]);
  });

  it('keeps the written range as a part', () => {
    expect(parse('0 0 * * FRI-MON').dayOfWeek.parts).toEqual([
      { kind: 'range', start: 5, end: 1, step: 1 },
    ]);
  });

  it('counts a step from the range start across the wrap', () => {
    expect(parse('0 0 * * FRI-MON/2').dayOfWeek.values).toEqual([0, 5]);
    expect(parse('0 0 * * THU-TUE/3').dayOfWeek.values).toEqual([0, 4]);
  });

  it('handles SUN-SAT, SAT-SUN and wraps that include 7', () => {
    expect(parse('0 0 * * SUN-SAT').dayOfWeek.values).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parse('0 0 * * SAT-SUN').dayOfWeek.values).toEqual([0, 6]);
    expect(parse('0 0 * * 7-2').dayOfWeek.values).toEqual([0, 1, 2]);
    expect(parse('0 0 * * 6-0').dayOfWeek.values).toEqual([0, 6]);
  });

  it('still rejects reversed ranges in other fields', () => {
    for (const expr of ['30-10 * * * *', '0 17-9 * * *', '0 0 20-10 * *', '0 0 * DEC-JAN *']) {
      expect(() => parse(expr)).toThrow(/range start \d+ is greater than range end \d+/);
    }
  });

  it('describes a wrapping range', () => {
    expect(describe('0 9 * * FRI-MON')).toBe('At 09:00 on Friday through Monday');
  });

  it('only runs on Friday through Monday', () => {
    // 2026-01-01 is a Thursday.
    const from = new Date('2026-01-01T12:00:00Z');
    const runs = nextRuns('0 9 * * FRI-MON', from, 6);
    expect(iso(runs)).toEqual([
      '2026-01-02T09:00:00.000Z',
      '2026-01-03T09:00:00.000Z',
      '2026-01-04T09:00:00.000Z',
      '2026-01-05T09:00:00.000Z',
      '2026-01-09T09:00:00.000Z',
      '2026-01-10T09:00:00.000Z',
    ]);
    expect(new Set(runs.map((d) => d.getUTCDay()))).toEqual(new Set([5, 6, 0, 1]));
  });
});

group('a/n step shorthand', () => {
  it('treats a/n as a-max/n', () => {
    expect(parse('5/15 * * * *').minute.values).toEqual([5, 20, 35, 50]);
    expect(parse('5/15 * * * *').minute.parts).toEqual([
      { kind: 'range', start: 5, end: 59, step: 15 },
    ]);
  });

  it('works in every field', () => {
    const cron = parse('5/15 8/6 10/10 3/4 1/2');
    expect(cron.hour.values).toEqual([8, 14, 20]);
    expect(cron.dayOfMonth.values).toEqual([10, 20, 30]);
    expect(cron.month.values).toEqual([3, 7, 11]);
    expect(cron.dayOfWeek.values).toEqual([1, 3, 5]);
  });

  it('accepts names before the step', () => {
    expect(parse('0 0 1 FEB/3 *').month.values).toEqual([2, 5, 8, 11]);
    expect(parse('0 0 * * WED/2').dayOfWeek.values).toEqual([3, 5]);
  });

  it('gives a single value when the step passes the end', () => {
    expect(parse('50/30 * * * *').minute.values).toEqual([50]);
    expect(parse('0 0 * * 7/1').dayOfWeek.values).toEqual([0]);
  });

  it('describes the shorthand as a range', () => {
    expect(describe('5/15 * * * *')).toBe('Every 15 minutes from minute 5 through 59');
  });

  it('runs from the start value', () => {
    const from = new Date('2026-01-01T10:00:00Z');
    expect(iso(nextRuns('5/15 * * * *', from, 3))).toEqual([
      '2026-01-01T10:05:00.000Z',
      '2026-01-01T10:20:00.000Z',
      '2026-01-01T10:35:00.000Z',
    ]);
  });

  it('still validates the value and the step', () => {
    expect(() => parse('60/5 * * * *')).toThrow(CronParseError);
    expect(() => parse('5/0 * * * *')).toThrow(/step must be at least 1/);
  });
});
