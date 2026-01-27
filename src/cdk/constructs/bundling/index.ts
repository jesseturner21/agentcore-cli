/**
 * Bundling constructs for packaging code artifacts.
 *
 * Organization:
 * - docker/ - Container image assets for ContainerImage runtime
 * - zip/ - Code zip assets for CodeZip runtime
 */

// Docker/Container image bundling
export type { IContainerAsset } from './docker';
export { LocalDockerAsset, type LocalDockerAssetProps } from './docker';

// Zip/CodeZip bundling
export { BundledCodeZipAsset, type BundledCodeZipAssetProps, type PackageResult } from './zip';
export { PythonBundledCodeZipAsset } from './zip';
