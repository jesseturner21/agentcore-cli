import { resolveCodeLocation } from '../../../../lib';
import type { ContainerImageRuntime } from '../../../../schema';
import type { IContainerAsset } from './IContainerAsset';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';

export interface LocalDockerAssetProps {
  /**
   * The container runtime configuration.
   * Uses buildContextPath and dockerfilePath to build the image locally.
   */
  runtime: ContainerImageRuntime;

  /**
   * The resolved path to the agentcore config directory.
   * Used to resolve relative paths in the runtime configuration.
   */
  configRoot: string;
}

/**
 * Builds a Docker image locally and uploads to ECR.
 * Uses CDK's DockerImageAsset under the hood.
 */
export class LocalDockerAsset extends Construct implements IContainerAsset {
  public readonly dockerImageAsset: DockerImageAsset;

  constructor(scope: Construct, id: string, props: LocalDockerAssetProps) {
    super(scope, id);

    const { runtime, configRoot } = props;

    const buildContext = resolveCodeLocation(runtime.buildContextPath, configRoot);

    this.dockerImageAsset = new DockerImageAsset(this, 'DockerImage', {
      directory: buildContext,
      file: runtime.dockerfilePath,
    });
  }

  get imageUri(): string {
    return this.dockerImageAsset.imageUri;
  }
}
