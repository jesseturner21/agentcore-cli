/**
 * Interface for container image assets.
 * Implemented by LocalDockerAsset and (future) RemoteDockerAsset.
 */
export interface IContainerAsset {
  /**
   * The ECR image URI for the container.
   */
  readonly imageUri: string;
}
