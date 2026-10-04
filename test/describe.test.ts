import { describe as group, expect, it } from 'vitest';
import { CronParseError, describe, parse } from '../src/index.js';

group('describe', () => {
  it.each([
    ['* * * * *', 'Every minute'],
    ['*/15 * * * *', 'Every 15 minutes'],
    ['30 9 * * 1-5', 'At 09:30 on Monday through Friday'],
    ['0 0 1 * *', 'At 00:00 on day 1 of the month'],
    ['0 0 * * *', 'At 00:00'],
    ['5 * * * *', 'At minute 5 past every hour'],
    ['0,30 * * * *', 'At minutes 0 and 30 past every hour'],
    ['0 9,17 * * *', 'At 09:00 and 17:00'],
    ['0 */2 * * *', 'At minute 0 past every 2nd hour'],
    ['*/10 9-17 * * *', 'Every 10 minutes past hours 9 through 17'],
    ['* 9 * * *', 'Every minute from 09:00 through 09:59'],
    ['0 12 1,15 * *', 'At 12:00 on days 1 and 15 of the month'],
    ['0 0 1-7 * *', 'At 00:00 on days 1 through 7 of the month'],
    ['0 8 * * MON,WED,FRI', 'At 08:00 on Monday, Wednesday and Friday'],
    ['0 8 * * 0', 'At 08:00 on Sunday'],
    ['0 8 * * 7', 'At 08:00 on Sunday'],
    ['0 0 * * 0,7', 'At 00:00 on Sunday'],
    ['0 0 * * SUN,7', 'At 00:00 on Sunday'],
    ['0 0 * * 5-7', 'At 00:00 on Friday through Sunday'],
    ['0 0 1 JAN *', 'At 00:00 on day 1 of the month in January'],
    ['0 0 * 6-8 *', 'At 00:00 in June through August'],
    ['0 0 1 */3 *', 'At 00:00 on day 1 of the month in every 3rd month'],
    ['0 0 */2 * *', 'At 00:00 on every 2nd day of the month'],
  ])('describes "%s"', (expr, expected) => {
    expect(describe(expr)).toBe(expected);
  });

  it('uses "or" when both day-of-month and day-of-week are restricted', () => {
    expect(describe('0 9 13 * 5')).toBe('At 09:00 on day 13 of the month or on Friday');
  });

  it('accepts an already-parsed expression', () => {
    expect(describe(parse('0 6 * * *'))).toBe('At 06:00');
  });

  it('throws CronParseError for invalid input', () => {
    expect(() => describe('nope')).toThrow(CronParseError);
  });
});
