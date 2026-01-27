import { checkSubprocess, runSubprocessCapture } from '../../../lib';

export type PythonSetupStatus = 'success' | 'uv_not_found' | 'venv_failed' | 'install_failed';

export interface PythonSetupResult {
  status: PythonSetupStatus;
  error?: string;
}

export interface PythonSetupOptions {
  projectDir: string;
  venvName?: string;
}

/**
 * Check if uv is available on the system.
 */
export async function checkUvAvailable(): Promise<boolean> {
  return checkSubprocess('uv', ['--version']);
}

/**
 * Create a Python virtual environment using uv.
 */
export async function createVenv(projectDir: string, venvName = '.venv'): Promise<PythonSetupResult> {
  const result = await runSubprocessCapture('uv', ['venv', venvName], { cwd: projectDir });
  if (result.code === 0) {
    return { status: 'success' };
  }
  return { status: 'venv_failed', error: result.stderr || result.stdout };
}

/**
 * Install dependencies using uv sync.
 */
export async function installDependencies(projectDir: string): Promise<PythonSetupResult> {
  const result = await runSubprocessCapture('uv', ['sync'], { cwd: projectDir });
  if (result.code === 0) {
    return { status: 'success' };
  }
  return { status: 'install_failed', error: result.stderr || result.stdout };
}

/**
 * Set up a Python project: create venv and install dependencies.
 * Returns a result with status and optional error details.
 */
export async function setupPythonProject(options: PythonSetupOptions): Promise<PythonSetupResult> {
  const { projectDir, venvName = '.venv' } = options;

  const uvAvailable = await checkUvAvailable();
  if (!uvAvailable) {
    return {
      status: 'uv_not_found',
      error: 'uv command not found. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh',
    };
  }

  const venvResult = await createVenv(projectDir, venvName);
  if (venvResult.status !== 'success') {
    return venvResult;
  }

  return installDependencies(projectDir);
}
