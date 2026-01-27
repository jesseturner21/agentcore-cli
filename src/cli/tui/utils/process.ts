import { isWindows, runSubprocessCapture } from '../../../lib';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Check if a process with the given PID is currently running.
 * Uses async subprocess calls to avoid blocking the TUI event loop.
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
  if (isWindows) {
    return isProcessRunningWindows(pid);
  }
  return isProcessRunningUnix(pid);
}

/**
 * Check if a process is running on Unix-like systems (macOS, Linux).
 * This uses process.kill(pid, 0) which is synchronous but near-instant
 * (it's a syscall, not a subprocess), so it won't block the event loop.
 */
function isProcessRunningUnix(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a process is running on Windows.
 * Uses async subprocess to avoid blocking the TUI event loop.
 */
async function isProcessRunningWindows(pid: number): Promise<boolean> {
  try {
    const result = await runSubprocessCapture('tasklist', ['/FI', `PID eq ${pid}`, '/NH']);
    return !result.stdout.includes('No tasks');
  } catch {
    return false;
  }
}

/**
 * Clean up stale CDK read-lock files from cdk.out directory.
 * Only removes read.<PID>.<number>.lock files where the owning process is no longer running.
 * Does NOT touch synth.lock or other coordination files to avoid corrupting concurrent runs.
 *
 * This function is async to avoid blocking the TUI event loop on Windows.
 */
export async function cleanupStaleLockFiles(cdkOutDir: string): Promise<void> {
  if (!fs.existsSync(cdkOutDir)) return;

  const files = await fsp.readdir(cdkOutDir);
  const readLockPattern = /^read\.(\d+)\.\d+\.lock$/;

  for (const file of files) {
    const match = readLockPattern.exec(file);
    if (!match?.[1]) continue;

    const pid = parseInt(match[1], 10);
    if (isNaN(pid)) continue;

    if (!(await isProcessRunning(pid))) {
      const lockFilePath = path.join(cdkOutDir, file);
      try {
        await fsp.unlink(lockFilePath);
      } catch {
        // Ignore - file may have been removed by another process
      }
    }
  }
}
