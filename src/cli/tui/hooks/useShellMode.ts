import { type ShellExecutor, type ShellMode, spawnPersistentShellCommand, truncateOutput } from '../../shell';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseShellModeResult {
  // State
  mode: ShellMode;
  command: string;
  output: string[];
  exitCode: number | null;

  // Actions
  activate: () => void;
  deactivate: () => void;
  setCommand: (cmd: string) => void;
  appendToCommand: (char: string) => void;
  backspaceCommand: () => void;
  execute: () => void;
  interrupt: () => void;
  continueInput: () => void;
  acknowledge: () => void;
}

interface UseShellModeOptions {
  initialCommand?: string;
}

export function useShellMode(options?: UseShellModeOptions): UseShellModeResult {
  const initialCommand = options?.initialCommand;
  // Use explicit undefined check so empty string '' still activates shell mode
  const [mode, setMode] = useState<ShellMode>(initialCommand !== undefined ? 'input' : 'inactive');
  const [command, setCommandState] = useState(initialCommand ?? '');
  const [output, setOutput] = useState<string[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);

  const executorRef = useRef<ShellExecutor | null>(null);

  const appendOutput = useCallback((lines: string[]) => {
    setOutput(prev => truncateOutput([...prev, ...lines]));
  }, []);

  const activate = useCallback(() => {
    setMode('input');
    setCommandState('');
    setOutput([]);
    setExitCode(null);
  }, []);

  const deactivate = useCallback(() => {
    if (executorRef.current) {
      executorRef.current.kill();
      executorRef.current = null;
    }
    setMode('inactive');
    setCommandState('');
    setOutput([]);
    setExitCode(null);
  }, []);

  const setCommand = useCallback((cmd: string) => {
    // Filter out carriage returns which can cause display issues in the TUI
    setCommandState(cmd.replace(/\r/g, ''));
  }, []);

  const appendToCommand = useCallback((char: string) => {
    // Filter out carriage returns which can cause display issues in the TUI
    // Newlines are preserved for multi-line command execution
    if (char === '\r') return;
    setCommandState(prev => prev + char);
  }, []);

  const backspaceCommand = useCallback(() => {
    setCommandState(prev => prev.slice(0, -1));
  }, []);

  const execute = useCallback(() => {
    if (!command.trim() || (mode !== 'input' && mode !== 'done')) return;

    setMode('running');
    setOutput([]);
    setExitCode(null);

    executorRef.current = spawnPersistentShellCommand(command, {
      onOutput: appendOutput,
      onComplete: code => {
        setExitCode(code);
        setMode('done');
        executorRef.current = null;
      },
      onError: error => {
        appendOutput([error]);
      },
    });
  }, [command, mode, appendOutput]);

  const interrupt = useCallback(() => {
    if (mode === 'running' && executorRef.current) {
      executorRef.current.kill('SIGINT');
    }
  }, [mode]);

  // Transition from done to input without clearing output
  // Output only clears when next command executes
  const continueInput = useCallback(() => {
    setMode('input');
  }, []);

  const acknowledge = useCallback(() => {
    setMode('input');
    setCommandState('');
    setOutput([]);
    setExitCode(null);
  }, []);

  useEffect(() => {
    return () => {
      if (executorRef.current) {
        executorRef.current.kill();
      }
    };
  }, []);

  return {
    mode,
    command,
    output,
    exitCode,
    activate,
    deactivate,
    setCommand,
    appendToCommand,
    backspaceCommand,
    execute,
    interrupt,
    continueInput,
    acknowledge,
  };
}
