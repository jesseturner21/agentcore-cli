import type { AgentCoreRuntimeComputeConfig, CodeZipRuntime } from '../../../../schema';
import { PythonBundledCodeZipAsset } from '../../bundling';
import type { AgentCoreComponentProps } from '../base-props';
import { AgentCoreRuntime } from '../primitives/runtime/AgentCoreRuntime';
import { getRuntimeEndpointUrl } from './mcp-utils';
import { aws_iam as iam, aws_s3_assets as s3assets } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface McpRuntimeComputeProps extends AgentCoreComponentProps {
  /** Name of the tool this compute is for */
  readonly toolName: string;
  /** AgentCore Runtime compute configuration from schema */
  readonly compute: AgentCoreRuntimeComputeConfig;
}

/**
 * Creates AgentCore Runtime-backed compute for an MCP tool.
 *
 * This component handles:
 * - Bundling Python code into a zip asset
 * - Creating the AgentCoreRuntime primitive
 * - Generating the runtime endpoint URL
 *
 * Only supports Python implementations (AgentCore Runtime limitation).
 */
export class McpRuntimeCompute extends Construct {
  public readonly runtime: AgentCoreRuntime;
  public readonly endpointUrl: string;
  public readonly asset: s3assets.Asset;

  constructor(scope: Construct, id: string, props: McpRuntimeComputeProps) {
    super(scope, id);

    const { toolName, compute, projectName } = props;

    // Validate Python-only
    if (compute.implementation.language !== 'Python') {
      throw new Error(
        `AgentCore Runtime only supports Python. Tool "${toolName}" uses "${compute.implementation.language}"`
      );
    }

    // Runtime config must be explicitly provided - no CLI-managed defaults
    if (!compute.runtime) {
      throw new Error(`Runtime configuration is required for MCP Runtime tool "${toolName}"`);
    }

    const runtimeConfig: CodeZipRuntime = compute.runtime;

    // Create bundled asset using the explicit runtime config
    const bundledAsset = new PythonBundledCodeZipAsset(this, 'CodeAsset', {
      runtime: runtimeConfig,
    });
    this.asset = bundledAsset.asset;

    // Create runtime using the reusable primitive
    this.runtime = new AgentCoreRuntime(this, 'Runtime', {
      projectName,
      runtime: runtimeConfig,
      codeAsset: this.asset,
    });

    // Generate endpoint URL
    this.endpointUrl = getRuntimeEndpointUrl(this.runtime.runtimeArn);
  }

  /**
   * Grants invoke permission to the given principal.
   */
  public grantInvoke(grantee: iam.IGrantable): iam.Grant {
    return this.runtime.grantInvoke(grantee);
  }

  /**
   * Adds an IAM policy statement to the runtime's role.
   */
  public addToPolicy(statement: iam.PolicyStatement): void {
    this.runtime.addToPolicy(statement);
  }
}
