import { useInput } from 'ink';

/**
 * Hook that handles the standard exit keys (Escape, 'q').
 * Should be used at the top level of screens that need exit handling.
 *
 * @param onExit - Callback to invoke when exit is requested
 * @param enabled - Whether exit handling is enabled (default: true)
 */
export function useExitHandler(onExit: () => void, enabled = true): void {
  useInput(
    (input, key) => {
      if (key.escape || input === 'q') {
        onExit();
      }
    },
    { isActive: enabled }
  );
}
