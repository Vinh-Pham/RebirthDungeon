/**
 * Minimal Result type for operations that can fail with a typed error.
 * Intentionally dependency-free: this is innermost-layer (src/core) code.
 */
export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export const ok = <TValue>(value: TValue): Result<TValue, never> => ({
  ok: true,
  value,
});

export const err = <TError>(error: TError): Result<never, TError> => ({
  ok: false,
  error,
});

export const isOk = <TValue, TError>(
  result: Result<TValue, TError>,
): result is { readonly ok: true; readonly value: TValue } => result.ok;

export const isErr = <TValue, TError>(
  result: Result<TValue, TError>,
): result is { readonly ok: false; readonly error: TError } => !result.ok;

export const map = <TValue, TError, TNext>(
  result: Result<TValue, TError>,
  fn: (value: TValue) => TNext,
): Result<TNext, TError> => (result.ok ? ok(fn(result.value)) : result);

export const mapErr = <TValue, TError, TNext>(
  result: Result<TValue, TError>,
  fn: (error: TError) => TNext,
): Result<TValue, TNext> => (result.ok ? result : err(fn(result.error)));

export const unwrapOr = <TValue, TError>(
  result: Result<TValue, TError>,
  fallback: TValue,
): TValue => (result.ok ? result.value : fallback);
