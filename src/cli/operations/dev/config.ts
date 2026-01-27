import { ConfigIO, findConfigRoot } from '../../../lib';
import type { AgentCoreProjectSpec, AgentEnvSpec } from '../../../schema';
import { dirname, isAbsolute, join } from 'node:path';

export interface DevConfig {
  agentName: string;
  module: string;
  directory: string;
  hasConfig: boolean;
  isPython: boolean;
}

interface DevSupportResult {
  supported: boolean;
  reason?: string;
}

/**
 * Checks if dev mode is supported for the given agent.
 *
 * Requirements:
 * - Agent must target Python (TypeScript support not yet implemented)
 * - CodeZip agents must have entrypoint
 * - ContainerImage agents must have entrypoint (optional field)
 */
function isDevSupported(agent: AgentEnvSpec): DevSupportResult {
  // Currently only Python is supported for dev mode
  // TODO: Add TypeScript support
  if (agent.targetLanguage !== 'Python') {
    return {
      supported: false,
      reason: `Dev mode only supports Python agents. Agent "${agent.name}" targets ${agent.targetLanguage}.`,
    };
  }

  if (agent.runtime.artifact === 'ContainerImage') {
    return {
      supported: false,
      reason: `ContainerImage agent "${agent.name}" does not support dev mode.`,
    };
  }

  if (agent.runtime.artifact === 'CodeZip' && !agent.runtime.entrypoint) {
    return {
      supported: false,
      reason: `CodeZip agent "${agent.name}" is missing entrypoint.`,
    };
  }

  return { supported: true };
}

/**
 * Resolves the agent's code directory from codeLocation.
 * codeLocation can be absolute or relative to the project root.
 */
function resolveCodeDirectory(codeLocation: string, configRoot: string): string {
  const cleanPath = codeLocation.replace(/\/$/, '');

  if (isAbsolute(cleanPath)) {
    return cleanPath;
  }

  const projectRoot = dirname(configRoot);
  return join(projectRoot, cleanPath);
}

/**
 * Derives dev server configuration from project config.
 * Falls back to sensible defaults if no config is available.
 */
export function getDevConfig(workingDir: string, project: AgentCoreProjectSpec | null, configRoot?: string): DevConfig {
  const dirName = workingDir.split('/').pop() ?? 'unknown';
  const firstAgent = project?.agents[0];

  if (!firstAgent) {
    return {
      agentName: `${dirName}_Agent`,
      module: 'src.main:app',
      directory: workingDir,
      hasConfig: false,
      isPython: true,
    };
  }

  const supportResult = isDevSupported(firstAgent);
  if (!supportResult.supported) {
    throw new Error(supportResult.reason ?? 'Agent does not support dev mode');
  }

  const directory =
    configRoot && firstAgent.runtime.artifact === 'CodeZip' && firstAgent.runtime.codeLocation
      ? resolveCodeDirectory(firstAgent.runtime.codeLocation, configRoot)
      : workingDir;

  // At this point we know it's CodeZip (ContainerImage is rejected above)
  const runtime = firstAgent.runtime as { entrypoint: string };

  return {
    agentName: firstAgent.name,
    module: runtime.entrypoint,
    directory,
    hasConfig: true,
    isPython: firstAgent.targetLanguage === 'Python',
  };
}

/**
 * Loads project configuration from the agentcore directory.
 * Walks up from workingDir to find the agentcore config directory.
 * Returns null if config doesn't exist or is invalid.
 */
export async function loadProjectConfig(workingDir: string): Promise<AgentCoreProjectSpec | null> {
  const configRoot = findConfigRoot(workingDir);
  if (!configRoot) {
    return null;
  }

  const configIO = new ConfigIO({ baseDir: configRoot });

  if (!configIO.configExists('project')) {
    return null;
  }

  try {
    return await configIO.readProjectSpec();
  } catch {
    // Invalid config
    return null;
  }
}
