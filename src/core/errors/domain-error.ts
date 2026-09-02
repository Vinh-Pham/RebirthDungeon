/**
 * Base error for all domain-rule violations. Domain code throws these instead
 * of plain Errors so application layers can distinguish game-rule failures
 * from programming errors.
 */
export class DomainError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DomainError';
  }
}
