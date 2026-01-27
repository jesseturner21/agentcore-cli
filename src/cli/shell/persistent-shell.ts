/**
 * Persistent Shell - Fast alias-capable execution path
 *
 * Uses 'script' command to allocate a PTY for proper output buffering.
 * Without a PTY, commands use block buffering and output gets stuck.
 *
 * Constraints:
 * - Single command at a time (concurrent calls throw)
 * - Ctrl-C kills shell entirely (next command re-warms)
 * - Output collected until completion (no streaming)
 *
 * This is an optimization tier, not a general shell executor.
 */
import type { ShellExecutor, ShellExecutorCallbacks } from './types';
import { ChildProcess, spawn } from 'node:child_process';

const MARKER = `__AGENTCORE_DONE_${process.pid}_${Date.now()}__`;

/**
 * Extract AWS credential exports from a command and mirror them to process.env.
 * This allows credentials set in shell mode to be picked up by the Node AWS SDK.
 *
 * Handles concatenated exports like: export AWS_ACCESS_KEY_ID=xxxexport AWS_SECRET_ACCESS_KEY=yyy
 * (where exports run together without separators)
 */
function syncAwsExports(cmd: string): void {
  // Pre-process: insert newlines before 'export' keywords to handle concatenated pastes
  const normalizedCmd = cmd.replace(/export\s+AWS_/g, '\nexport AWS_');

  // Match export statements - handle both quoted and unquoted values
  const regex = /export\s+(AWS_[A-Z_]+)=(?:"([^"]*)"|'([^']*)'|([^\s\n;]+))/g;
  let match;
  while ((match = regex.exec(normalizedCmd)) !== null) {
    const key = match[1];
    // Value is in group 2 (double quoted), 3 (single quoted), or 4 (unquoted)
    const value = match[2] ?? match[3] ?? match[4];
    if (key && value) {
      process.env[key] = value;
    }
  }
}

let shell: ChildProcess | null = null;
let buffer = '';
let activeCallback: ShellExecutorCallbacks | null = null;
let busy = false;

function onData(data: Buffer) {
  buffer += data.toString();

  if (!busy || !activeCallback) return;

  const idx = buffer.indexOf(MARKER);
  if (idx >= 0) {
    const out = buffer.slice(0, idx);
    const rest = buffer.slice(idx + MARKER.length);
    const code = parseInt(/^(\d+)/.exec(rest)?.[0] ?? '0', 10);
    buffer = '';
    busy = false;

    const lines = out.split(/\r?\n/).filter(Boolean);
    if (lines.length) activeCallback.onOutput(lines);
    activeCallback.onComplete(code);
    activeCallback = null;
  }
}

function ensureShell(): ChildProcess {
  if (shell && !shell.killed) return shell;

  const sh = process.env.SHELL ?? '/bin/sh';
  const home = process.env.HOME ?? '';

  // Use 'script' to allocate a PTY, which forces line-buffered output.
  // Without a PTY, commands like 'ls' and 'aws' use block buffering and
  // their output (including our marker) gets stuck in the buffer.
  // On macOS: script -q /dev/null <shell>
  // On Linux: script -q /dev/null -c <shell>
  const platform = process.platform;
  const scriptArgs = platform === 'darwin' ? ['-q', '/dev/null', sh] : ['-q', '/dev/null', '-c', sh];

  shell = spawn('script', scriptArgs, {
    cwd: process.cwd(),
    env: { ...process.env, PS1: '', PS2: '', TERM: 'dumb' },
  });

  shell.stdout?.on('data', onData);
  shell.stderr?.on('data', onData);
  shell.on('close', () => {
    shell = null;
  });

  // Source config (output goes to buffer, will be cleared on first command)
  const rc = sh.includes('zsh')
    ? `source "${home}/.zshrc" 2>/dev/null`
    : sh.includes('bash')
      ? `[ -f ~/.bashrc ] && . ~/.bashrc; shopt -s expand_aliases`
      : '';

  if (rc) {
    shell.stdin?.write(`${rc}\n`);
  }

  return shell;
}

/** Call on app start to pre-warm shell during idle time */
export function warmup(): void {
  ensureShell();
}

/** Execute command in persistent shell. Throws if shell is busy. */
export function spawnPersistentShellCommand(cmd: string, callbacks: ShellExecutorCallbacks): ShellExecutor {
  if (busy) {
    throw new Error('Shell busy: concurrent commands not supported');
  }

  const s = ensureShell();
  busy = true;
  activeCallback = callbacks;
  buffer = '';
  syncAwsExports(cmd);
  s.stdin?.write(`${cmd}; echo "${MARKER}$?"\n`);

  return {
    child: s,
    kill: () => {
      shell?.kill();
      shell = null;
      busy = false;
      activeCallback = null;
      callbacks.onComplete(130);
    },
  };
}

/** Destroy shell (cleanup on app exit) */
export function destroyShell(): void {
  shell?.kill();
  shell = null;
  busy = false;
  activeCallback = null;
}
