/**
 * Returns a loader that coalesces concurrent calls into one in-flight promise.
 * Clears the slot when the promise settles (success or failure).
 */
export function dedupeAsync<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  let inFlight: Promise<TResult> | null = null;

  return (...args: TArgs) => {
    if (inFlight) return inFlight;
    const promise = fn(...args).finally(() => {
      if (inFlight === promise) inFlight = null;
    });
    inFlight = promise;
    return promise;
  };
}
