/**
 * Main entry point for the @aws/agentcore-cli package.
 * Exports public APIs from schema, lib, and cdk modules.
 */

// Schema exports (types, constants, errors)
export * from './schema';

// Lib exports (utilities, packaging, config I/O)
export * from './lib';

// CDK exports (constructs, logical IDs) - for backward compatibility
export * from './cdk';
