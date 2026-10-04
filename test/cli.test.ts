import { describe, expect, it } from 'vitest';
import { MAX_NEXT, parseArgs } from '../src/cli/args.js';
import { run } from '../src/cli/run.js';

function runCli(argv: string[]): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = run(argv, {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    now: () => new Date('2026-01-02T10:00:00Z'),
  });
  return { code, out, err };
}

describe('parseArgs', () => {
  it('reads a single expression', () => {
    expect(parseArgs(['0 9 * * *'])).toEqual({ kind: 'run', expression: '0 9 * * *', next: 0 });
  });

  it('reads --next N and --next=N', () => {
    expect(parseArgs(['* * * * *', '--next', '3'])).toMatchObject({ next: 3 });
    expect(parseArgs(['--next=5', '* * * * *'])).toMatchObject({ next: 5 });
  });

  it('recognises help flags', () => {
    expect(parseArgs(['-h'])).toEqual({ kind: 'help' });
    expect(parseArgs(['* * * * *', '--help'])).toEqual({ kind: 'help' });
  });

  it.each([
    [[], /Missing cron expression/],
    [['* * * * *', '--next'], /--next requires a number/],
    [['* * * * *', '--next', 'abc'], /--next must be a whole number/],
    [['* * * * *', '--next', '0'], /--next must be a whole number/],
    [['* * * * *', `--next=${MAX_NEXT + 1}`], /--next must be a whole number/],
    [['* * * * *', '--json'], /Unknown option: --json/],
    [['0', '9', '*', '*', '*'], /single expression/],
  ])('rejects %j', (argv, message) => {
    const result = parseArgs(argv);
    expect(result.kind).toBe('error');
    expect(result.kind === 'error' && result.message).toMatch(message);
  });
});

describe('run', () => {
  it('prints the description', () => {
    expect(runCli(['30 9 * * 1-5'])).toEqual({
      code: 0,
      out: ['At 09:30 on Monday through Friday'],
      err: [],
    });
  });

  it('prints next run times in UTC ISO format', () => {
    const { code, out } = runCli(['30 9 * * 1-5', '--next', '2']);
    expect(code).toBe(0);
    expect(out).toEqual([
      'At 09:30 on Monday through Friday',
      '2026-01-05T09:30:00.000Z',
      '2026-01-06T09:30:00.000Z',
    ]);
  });

  it('exits 1 with the parse error on an invalid expression', () => {
    const { code, out, err } = runCli(['99 * * * *']);
    expect(code).toBe(1);
    expect(out).toEqual([]);
    expect(err).toEqual(['cronspeak: Invalid minute field: 99 is out of range (0-59)']);
  });

  it('exits 2 with usage on bad arguments', () => {
    const { code, err } = runCli([]);
    expect(code).toBe(2);
    expect(err[0]).toBe('cronspeak: Missing cron expression');
    expect(err[1]).toMatch(/^Usage: cronspeak/);
  });

  it('prints usage for --help and exits 0', () => {
    const { code, out } = runCli(['--help']);
    expect(code).toBe(0);
    expect(out[0]).toMatch(/^Usage: cronspeak/);
  });
});
