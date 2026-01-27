/** Minimum duration for a step to be visible in the UI */
const MIN_STEP_DURATION_MS = 200;

/**
 * Wraps an async function to ensure it takes at least MIN_STEP_DURATION_MS.
 * Useful for UI steps that would otherwise complete too quickly to be visible.
 */
export async function withMinDuration<T>(fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;
  if (elapsed < MIN_STEP_DURATION_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_STEP_DURATION_MS - elapsed));
  }
  return result;
}
