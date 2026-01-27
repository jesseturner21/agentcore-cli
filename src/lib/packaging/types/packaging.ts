import type { AgentEnvSpec, CodeZipRuntime } from '../../../schema';

export interface PackageOptions {
  /** Optional override for project root; defaults to cwd or discovered root. */
  projectRoot?: string;
  /** Optional override for source directory; defaults to <projectRoot>/src. */
  srcDir?: string;
  /** Optional override for pyproject path; defaults to <projectRoot>/pyproject.toml. */
  pyprojectPath?: string;
  /** Optional override for artifact base directory; defaults to <projectRoot>/.agentcore. */
  artifactDir?: string;
  /** Optional override for python platform tag; defaults to aarch64-manylinux2014. */
  pythonPlatform?: string;
  /** Agent name for artifact naming and staging isolation. */
  agentName?: string;
  /** Output path for the zip artifact. If provided, writes directly here. */
  outputPath?: string;
}

export interface ArtifactResult {
  artifactPath: string;
  sizeBytes: number;
  stagingPath: string;
}

export interface RuntimePackager {
  pack(spec: AgentEnvSpec, options?: PackageOptions): Promise<ArtifactResult>;
}

/**
 * Simplified packager interface that works directly with CodeZipRuntime.
 * Used by CDK bundling constructs that don't have a full AgentEnvSpec.
 */
export interface CodeZipPackager {
  /**
   * Package code for a CodeZip runtime.
   * @param runtime The CodeZipRuntime configuration
   * @param options Packaging options
   * @returns ArtifactResult with the path to the created zip
   */
  packCodeZip(runtime: CodeZipRuntime, options?: PackageOptions): ArtifactResult;
}
