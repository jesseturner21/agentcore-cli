import { packCodeZipSync } from '../../../../lib';
import { BundledCodeZipAsset, type BundledCodeZipAssetProps, type PackageResult } from './BundledCodeZipAsset';
import { Construct } from 'constructs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * CDK construct that packages Python code into a zip and uploads to the bootstrap bucket.
 *
 * Uses the lib packager which handles:
 * - Installing dependencies via uv
 * - Cross-platform compilation for ARM64 Lambda/AgentCore runtime
 * - Creating the final zip artifact
 */
export class PythonBundledCodeZipAsset extends BundledCodeZipAsset {
  constructor(scope: Construct, id: string, props: BundledCodeZipAssetProps) {
    super(scope, id, props);
  }

  protected packageCode(): PackageResult {
    // Build staging goes to agentcore/.cache/
    const cacheDir = join(this.configRoot, '.cache');
    // Final zip goes to OS temp - CDK Asset will stage it to cdk.out/
    const outputPath = join(tmpdir(), `${this.runtime.name}-${randomUUID()}.zip`);

    const result = packCodeZipSync(this.runtime, {
      projectRoot: this.resolvedCodeLocation,
      srcDir: '.',
      artifactDir: cacheDir,
      outputPath,
      agentName: this.runtime.name,
    });

    return {
      artifactPath: result.artifactPath,
      sizeBytes: result.sizeBytes,
    };
  }
}
