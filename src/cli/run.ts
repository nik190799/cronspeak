import { CronParseError, parse } from '../core/index.js';
import { describe } from '../describe/index.js';
import { nextRuns } from '../schedule/index.js';
import { USAGE, parseArgs } from './args.js';

export interface CliIo {
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
  /** Current time, injectable for tests. */
  readonly now: () => Date;
}

/** Exit codes: 0 success, 1 invalid expression, 2 usage error. */
export function run(argv: readonly string[], io: CliIo): number {
  const args = parseArgs(argv);

  if (args.kind === 'help') {
    io.stdout(USAGE);
    return 0;
  }
  if (args.kind === 'error') {
    io.stderr(`cronspeak: ${args.message}`);
    io.stderr(USAGE);
    return 2;
  }

  try {
    const cron = parse(args.expression);
    io.stdout(describe(cron));
    if (args.next > 0) {
      for (const date of nextRuns(cron, io.now(), args.next)) {
        io.stdout(date.toISOString());
      }
    }
    return 0;
  } catch (error) {
    if (error instanceof CronParseError) {
      io.stderr(`cronspeak: ${error.message}`);
      return 1;
    }
    throw error;
  }
}
