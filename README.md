# cronspeak

Cron expressions in plain English. A small, dependency-free TypeScript library and CLI that
parses standard 5-field cron expressions, describes them in words, and lists upcoming run times.

```ts
import { describe, nextRuns } from 'cronspeak';

describe('30 9 * * 1-5'); // "At 09:30 on Monday through Friday"
describe('*/15 * * * *'); // "Every 15 minutes"
describe('0 0 1 * *'); // "At 00:00 on day 1 of the month"

nextRuns('30 9 * * 1-5', new Date('2026-01-02T10:00:00Z'), 2);
// [2026-01-05T09:30:00.000Z, 2026-01-06T09:30:00.000Z]
```

## Install

```sh
npm install cronspeak
```

Requires Node.js 22 or later. The package is ESM-only.

## Supported syntax

A cron expression has five whitespace-separated fields:

```
┌──────── minute        0-59
│ ┌────── hour          0-23
│ │ ┌──── day of month  1-31
│ │ │ ┌── month         1-12 or JAN-DEC
│ │ │ │ ┌ day of week   0-7 or SUN-SAT (0 and 7 are Sunday)
│ │ │ │ │
* * * * *
```

Each field accepts:

| Syntax  | Meaning                             | Example           |
| ------- | ----------------------------------- | ----------------- |
| `*`     | every value                         | `* * * * *`       |
| `n`     | a single value                      | `30 9 * * *`      |
| `a-b`   | an inclusive range                  | `0 9-17 * * *`    |
| `a,b,c` | a list (of any of these)            | `0,30 * * * *`    |
| `*/n`   | every n-th value                    | `*/15 * * * *`    |
| `a-b/n` | every n-th value in a range         | `0 8-18/2 * * *`  |
| `a/n`   | every n-th value from a: `a-max/n`  | `5/15 * * * *`    |
| `a-b`   | wrapping range (day-of-week only)   | `0 9 * * FRI-MON` |
| names   | `JAN`-`DEC`, `SUN`-`SAT` (any case) | `0 9 * * MON-FRI` |

A day-of-week range whose start is after its end wraps through the end of the week: `FRI-MON`
is Friday, Saturday, Sunday and Monday, and `FRI-MON/2` is Friday and Sunday (the step counts from
the start of the range). Only day-of-week ranges wrap: a reversed range in any other field, such
as hour `17-9`, is an error. For day-of-week, `a/n` stops at Saturday (6), like `*`, so `1/2` is
Monday, Wednesday and Friday.

When **both** day-of-month and day-of-week are restricted (neither starts with `*`), a day
matches if **either** field matches, as in standard cron. `0 9 13 * 5` runs at 09:00 on the
13th of every month _and_ on every Friday.

Not supported yet: time zones (run times are UTC), a seconds field, macros such as `@daily`,
the `L`, `W` and `#` specials, and non-English descriptions.

## API

### `parse(expr: string): CronExpression`

Validates an expression and returns its structured form. Each field exposes the parts as written
(`parts`), the expanded, sorted set of matching values (`values`), and whether it starts with `*`
(`wildcard`).

Invalid input throws a `CronParseError` whose `field` names the offending field (or is
`undefined` for whole-expression problems such as the wrong number of fields):

```ts
import { parse, CronParseError } from 'cronspeak';

try {
  parse('60 * * * *');
} catch (error) {
  if (error instanceof CronParseError) {
    error.message; // "Invalid minute field: 60 is out of range (0-59)"
    error.field; // "minute"
  }
}
```

### `describe(expr: string | CronExpression): string`

Returns a plain-English description. Accepts a string or the result of `parse`.

### `nextRuns(expr: string | CronExpression, from: Date, count: number): Date[]`

Returns up to `count` run times strictly after `from`, computed in UTC. Expressions that can never
fire (for example `0 0 30 2 *`) return fewer results, possibly none; the search looks about eight
years ahead.

## CLI

```sh
npx cronspeak "30 9 * * 1-5"
# At 09:30 on Monday through Friday

npx cronspeak "0 0 1 * *" --next 3
# At 00:00 on day 1 of the month
# 2026-11-01T00:00:00.000Z
# 2026-12-01T00:00:00.000Z
# 2027-01-01T00:00:00.000Z
```

Quote the expression so your shell does not expand `*`. Exit codes: `0` success, `1` invalid
expression, `2` usage error.

## Project layout

```
src/core/      parser, types and errors (no dependencies on other layers)
src/describe/  plain-English descriptions (depends on core)
src/schedule/  next-run calculation (depends on core)
src/cli/       command-line tool (the only code that touches process or console)
src/index.ts   public API
test/          Vitest tests
```

## Development

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## License

[MIT](LICENSE)
