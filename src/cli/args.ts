export const USAGE = `Usage: cronspeak "<expression>" [--next N]

Describe a 5-field cron expression in plain English.

Options:
  --next N     Also print the next N run times (UTC, ISO 8601)
  -h, --help   Show this help`;

export type CliArgs =
  | { readonly kind: 'help' }
  | { readonly kind: 'run'; readonly expression: string; readonly next: number }
  | { readonly kind: 'error'; readonly message: string };

/** Largest value accepted for `--next`, to keep output reasonable. */
export const MAX_NEXT = 1000;

/** Parse CLI arguments (excluding the node binary and script path). Pure: no I/O. */
export function parseArgs(argv: readonly string[]): CliArgs {
  let expression: string | undefined;
  let next = 0;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;

    if (arg === '-h' || arg === '--help') {
      return { kind: 'help' };
    }

    if (arg === '--next' || arg.startsWith('--next=')) {
      const raw = arg === '--next' ? argv[++i] : arg.slice('--next='.length);
      if (raw === undefined) {
        return { kind: 'error', message: '--next requires a number' };
      }
      if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > MAX_NEXT) {
        return {
          kind: 'error',
          message: `--next must be a whole number from 1 to ${MAX_NEXT}, got "${raw}"`,
        };
      }
      next = Number(raw);
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      return { kind: 'error', message: `Unknown option: ${arg}` };
    }

    if (expression !== undefined) {
      return {
        kind: 'error',
        message: 'Expected a single expression; wrap it in quotes, e.g. cronspeak "0 9 * * 1-5"',
      };
    }
    expression = arg;
  }

  if (expression === undefined) {
    return { kind: 'error', message: 'Missing cron expression' };
  }
  return { kind: 'run', expression, next };
}
