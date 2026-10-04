# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-03

### Added

- `parse(expr)` for standard 5-field cron expressions: `*`, numbers, ranges,
  lists, `*/n` and `a-b/n` steps, month names `JAN`-`DEC`, day names
  `SUN`-`SAT`, and day-of-week `0`-`7` (`7` is Sunday). Invalid input throws
  `CronParseError` with the offending field name.
- `describe(expr)` for plain-English descriptions.
- `nextRuns(expr, from, count)` for upcoming run times in UTC, honouring the
  day-of-month / day-of-week "either matches" rule.
- `cronspeak "<expr>" [--next N]` command-line tool.
