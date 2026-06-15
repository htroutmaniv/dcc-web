/** Thrown when an optimistic-lock write loses a version race; retry the whole read-modify-write. */
export class OptimisticLockConflict extends Error {
  override readonly name = 'OptimisticLockConflict';

  constructor(message = 'Optimistic lock conflict') {
    super(message);
  }
}

export async function withOptimisticRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof OptimisticLockConflict) || attempt >= maxAttempts) {
        throw error;
      }
    }
  }
  throw new Error('withOptimisticRetry: exhausted attempts without result');
}
