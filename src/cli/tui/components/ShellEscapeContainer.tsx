import { useShellMode } from '../hooks';
import { ShellContext } from './ShellContext';
import { ShellOutput } from './ShellOutput';
import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useRef } from 'react';

function ShellModeIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <Box paddingLeft={2} marginBottom={1}>
      <Text color="yellow">shell mode (esc to exit)</Text>
    </Box>
  );
}

interface ShellEscapeContainerProps {
  children: React.ReactNode;
  enabled?: boolean;
  reservedLines?: number;
  initialShellCommand?: string;
  /** Called when shell command completes. Used to auto-return to previous screen. */
  onShellComplete?: () => void;
}

/**
 * Wraps a screen to provide shell escape functionality.
 * When `!` is pressed, enters shell mode. The screen content stays visible,
 * and the prompt changes from `>` to `!` via ShellContext.
 * Command output appears below the screen content.
 */
export function ShellEscapeContainer({
  children,
  enabled = true,
  reservedLines,
  initialShellCommand,
  onShellComplete,
}: ShellEscapeContainerProps) {
  const shell = useShellMode({ initialCommand: initialShellCommand });
  const hasExecutedCommand = useRef(false);

  // Track when a command has been executed
  useEffect(() => {
    if (shell.mode === 'done' && shell.exitCode !== null) {
      hasExecutedCommand.current = true;
    }
  }, [shell.mode, shell.exitCode]);

  // Call onShellComplete when shell deactivates after executing a command
  useEffect(() => {
    if (shell.mode === 'inactive' && hasExecutedCommand.current && onShellComplete) {
      hasExecutedCommand.current = false;
      onShellComplete();
    }
  }, [shell.mode, onShellComplete]);

  useInput(
    (input, key) => {
      // Handle shell mode input
      if (shell.mode !== 'inactive') {
        if (key.ctrl && input === 'c') {
          if (shell.mode === 'running') {
            shell.interrupt();
          } else {
            shell.deactivate();
          }
          return;
        }

        // Escape should always deactivate, even when running
        if (key.escape) {
          if (shell.mode === 'running') {
            shell.interrupt();
          }
          shell.deactivate();
          return;
        }

        if (shell.mode === 'input') {
          if (key.return && shell.command.trim()) {
            shell.execute();
            return;
          }
          if (key.backspace || key.delete) {
            shell.backspaceCommand();
            return;
          }
          if (input && !key.ctrl && !key.meta) {
            shell.appendToCommand(input);
          }
        } else if (shell.mode === 'done') {
          if (key.return && shell.command.trim()) {
            // Re-run same command
            shell.execute();
          } else if (key.backspace || key.delete) {
            // Edit the previous command
            shell.backspaceCommand();
          } else if (input && !key.ctrl && !key.meta) {
            // Start fresh command
            shell.setCommand(input);
            shell.continueInput();
          }
        }
        return;
      }

      // ! enters shell mode (only when enabled and inactive)
      if (input === '!' && enabled) {
        shell.activate();
      }
    },
    { isActive: enabled }
  );

  const isActive = shell.mode !== 'inactive';

  const contextValue = useMemo(
    () => ({
      mode: shell.mode,
      command: shell.command,
      output: shell.output,
      exitCode: shell.exitCode,
      isActive,
    }),
    [shell.mode, shell.command, shell.output, shell.exitCode, isActive]
  );

  return (
    <ShellContext.Provider value={contextValue}>
      <Box flexDirection="column">
        {children}
        <ShellModeIndicator active={isActive} />
        <ShellOutput reservedLines={reservedLines} />
      </Box>
    </ShellContext.Provider>
  );
}
