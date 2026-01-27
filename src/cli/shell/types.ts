import type { ChildProcess } from 'node:child_process';

export type ShellMode = 'inactive' | 'input' | 'running' | 'done';

export interface ShellOutput {
  lines: string[];
  exitCode: number | null;
}

export interface ShellExecutorCallbacks {
  onOutput: (lines: string[]) => void;
  onComplete: (exitCode: number | null) => void;
  onError: (error: string) => void;
}

export interface ShellExecutor {
  child: ChildProcess;
  kill: (signal?: NodeJS.Signals) => void;
}
