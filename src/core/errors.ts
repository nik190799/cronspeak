import type { FieldName } from './types.js';

/** Thrown by `parse` when an expression is not a valid 5-field cron expression. */
export class CronParseError extends Error {
  /** The field that failed to parse, or `undefined` for whole-expression problems. */
  readonly field: FieldName | undefined;
  /** The full expression that was being parsed. */
  readonly expression: string;

  constructor(message: string, expression: string, field?: FieldName) {
    super(field === undefined ? message : `Invalid ${field} field: ${message}`);
    this.name = 'CronParseError';
    this.expression = expression;
    this.field = field;
  }
}
