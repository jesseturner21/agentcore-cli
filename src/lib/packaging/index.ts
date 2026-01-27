import type { AgentCoreProjectSpec, AgentEnvSpec, CodeZipRuntime } from '../../schema';
import { PackagingError, UnsupportedLanguageError } from './errors';
import { PythonCodeZipPackager, PythonCodeZipPackagerSync } from './python';
import type { ArtifactResult, CodeZipPackager, PackageOptions, RuntimePackager } from './types/packaging';

function selectPackager(spec: AgentEnvSpec): RuntimePackager {
  if (spec.targetLanguage === 'Python') {
    return new PythonCodeZipPackager();
  }

  if (spec.targetLanguage === 'TypeScript') {
    throw new UnsupportedLanguageError('TypeScript');
  }

  throw new PackagingError(`Unsupported target language: ${String(spec.targetLanguage)}`);
}

export async function packRuntime(spec: AgentEnvSpec, options?: PackageOptions): Promise<ArtifactResult> {
  if (spec.runtime.artifact !== 'CodeZip') {
    throw new PackagingError(
      `Packaging is only supported for CodeZip artifacts. Received: ${String(spec.runtime.artifact)}`
    );
  }

  const packager = selectPackager(spec);
  return packager.pack(spec, options);
}

/**
 * Validate that an agent exists in the config
 * @param project AgentCore project configuration
 * @param agentName Name of agent to validate
 * @throws PackagingError if agent not found
 */
export function validateAgentExists(project: AgentCoreProjectSpec, agentName: string): void {
  const agent = project.agents.find((a: AgentEnvSpec) => a.name === agentName);
  if (!agent) {
    const available = project.agents.map((a: AgentEnvSpec) => a.name).join(', ');
    throw new PackagingError(`Agent '${agentName}' not found. Available agents: ${available}`);
  }
}

/**
 * Get the CodeZip packager.
 * Currently only Python is supported for CodeZip runtimes.
 */
export function getCodeZipPackager(): CodeZipPackager {
  return new PythonCodeZipPackagerSync();
}

/**
 * Package a CodeZipRuntime synchronously.
 * This is the primary API for CDK bundling.
 */
export function packCodeZipSync(runtime: CodeZipRuntime, options?: PackageOptions): ArtifactResult {
  const packager = getCodeZipPackager();
  return packager.packCodeZip(runtime, options);
}

export type { ArtifactResult, CodeZipPackager, PackageOptions, RuntimePackager } from './types/packaging';
export * from './errors';
export { resolveCodeLocation } from './helpers';
