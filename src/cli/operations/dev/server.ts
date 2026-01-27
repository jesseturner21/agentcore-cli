import { type ChildProcess, spawn } from 'child_process';
import { createServer } from 'net';
import { join } from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'system';

export interface DevServerCallbacks {
  onLog: (level: LogLevel, message: string) => void;
  onExit: (code: number | null) => void;
}

export function findAvailablePort(startPort: number): Promise<number> {
  return new Promise(resolve => {
    const server = createServer();
    server.listen(startPort, '127.0.0.1', () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

function convertEntrypointToModule(entrypoint: string): string {
  if (entrypoint.includes(':')) return entrypoint;
  const path = entrypoint.replace(/\.py$/, '').replace(/\//g, '.');
  return `${path}:app`;
}

export interface SpawnDevServerOptions {
  module: string;
  cwd: string;
  port: number;
  isPython: boolean;
  callbacks: DevServerCallbacks;
  /** Additional environment variables to pass to the spawned process */
  envVars?: Record<string, string>;
}

export function spawnDevServer(options: SpawnDevServerOptions): ChildProcess {
  const { module, cwd, port, isPython, callbacks, envVars = {} } = options;
  const { onLog, onExit } = callbacks;

  // For Python, use the venv's uvicorn directly to avoid PATH issues
  const cmd = isPython ? join(cwd, '.venv', 'bin', 'uvicorn') : 'bun';
  const args = isPython
    ? [convertEntrypointToModule(module), '--reload', '--host', '127.0.0.1', '--port', String(port)]
    : ['run', '--watch', (module.split(':')[0] ?? module).replace(/\./g, '/') + '.ts'];

  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...envVars, PORT: String(port), LOCAL_DEV: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (!output) return;
    for (const line of output.split('\n')) {
      if (line) onLog('info', line);
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (!output) return;
    for (const line of output.split('\n')) {
      if (!line) continue;
      if (line.includes('WARNING')) onLog('warn', line);
      else if (line.includes('ERROR') || line.includes('error')) onLog('error', line);
      else onLog('info', line);
    }
  });

  child.on('error', err => {
    onLog('error', `Failed to start: ${err.message}`);
    onExit(1);
  });

  child.on('exit', code => onExit(code));

  return child;
}

export function killServer(child: ChildProcess | null): void {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL');
  }, 2000);
}
