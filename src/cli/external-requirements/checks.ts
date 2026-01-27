/**
 * External dependency version checks.
 */
import { runSubprocessCapture } from '../../lib';
import type { AgentCoreProjectSpec } from '../../schema';
import { NODE_MIN_VERSION, UV_MIN_VERSION, formatSemVer, parseSemVer, semVerGte } from './versions';

/**
 * Result of a version check.
 */
export interface VersionCheckResult {
  satisfied: boolean;
  current: string | null;
  required: string;
  binary: string;
}

/**
 * Extract version from `node --version` output.
 * Expected format: "v18.17.0" or "v20.10.0"
 */
function parseNodeVersion(output: string): string | null {
  const match = /v?(\d+\.\d+\.\d+)/.exec(output.trim());
  return match?.[1] ?? null;
}

/**
 * Extract version from `uv --version` output.
 * Expected format: "uv 0.9.2" or "uv 0.9.2 (abc123 2024-01-01)"
 */
function parseUvVersion(output: string): string | null {
  const match = /uv\s+(\d+\.\d+\.\d+)/.exec(output.trim());
  return match?.[1] ?? null;
}

/**
 * Check that Node.js meets minimum version requirement.
 */
export async function checkNodeVersion(): Promise<VersionCheckResult> {
  const required = formatSemVer(NODE_MIN_VERSION);

  const result = await runSubprocessCapture('node', ['--version']);
  if (result.code !== 0) {
    return { satisfied: false, current: null, required, binary: 'node' };
  }

  const versionStr = parseNodeVersion(result.stdout);
  if (!versionStr) {
    return { satisfied: false, current: null, required, binary: 'node' };
  }

  const current = parseSemVer(versionStr);
  if (!current) {
    return { satisfied: false, current: versionStr, required, binary: 'node' };
  }

  return {
    satisfied: semVerGte(current, NODE_MIN_VERSION),
    current: versionStr,
    required,
    binary: 'node',
  };
}

/**
 * Check that uv meets minimum version requirement.
 */
export async function checkUvVersion(): Promise<VersionCheckResult> {
  const required = formatSemVer(UV_MIN_VERSION);

  const result = await runSubprocessCapture('uv', ['--version']);
  if (result.code !== 0) {
    return { satisfied: false, current: null, required, binary: 'uv' };
  }

  const versionStr = parseUvVersion(result.stdout);
  if (!versionStr) {
    return { satisfied: false, current: null, required, binary: 'uv' };
  }

  const current = parseSemVer(versionStr);
  if (!current) {
    return { satisfied: false, current: versionStr, required, binary: 'uv' };
  }

  return {
    satisfied: semVerGte(current, UV_MIN_VERSION),
    current: versionStr,
    required,
    binary: 'uv',
  };
}

/**
 * Format a version check failure as a user-friendly error message.
 */
export function formatVersionError(result: VersionCheckResult): string {
  if (result.current === null) {
    if (result.binary === 'uv') {
      return `'${result.binary}' not found. Install uv >= ${result.required} from https://github.com/astral-sh/uv#installation`;
    }
    return `'${result.binary}' not found. Install ${result.binary} >= ${result.required}`;
  }
  return `${result.binary} ${result.current} is below minimum required version ${result.required}`;
}

/**
 * Check if the project has any Python CodeZip agents that require uv.
 */
export function requiresUv(projectSpec: AgentCoreProjectSpec): boolean {
  return projectSpec.agents.some(agent => agent.targetLanguage === 'Python' && agent.runtime.artifact === 'CodeZip');
}

/**
 * Result of dependency version checks.
 */
export interface DependencyCheckResult {
  passed: boolean;
  nodeCheck: VersionCheckResult;
  uvCheck: VersionCheckResult | null;
  errors: string[];
}

/**
 * Check that required dependency versions are met.
 * - Node >= 18 is always required for CDK synth
 * - uv >= 0.9.2 is required when there are Python CodeZip agents
 */
export async function checkDependencyVersions(projectSpec: AgentCoreProjectSpec): Promise<DependencyCheckResult> {
  const errors: string[] = [];

  // Always check Node version (required for CDK synth)
  const nodeCheck = await checkNodeVersion();
  if (!nodeCheck.satisfied) {
    errors.push(formatVersionError(nodeCheck));
  }

  // Check uv only if there are Python CodeZip agents
  let uvCheck: VersionCheckResult | null = null;
  if (requiresUv(projectSpec)) {
    uvCheck = await checkUvVersion();
    if (!uvCheck.satisfied) {
      errors.push(formatVersionError(uvCheck));
    }
  }

  return {
    passed: errors.length === 0,
    nodeCheck,
    uvCheck,
    errors,
  };
}
