import type { CodeZipRuntime, ContainerImageRuntime, ReferencedEcrImageRuntime } from '../../../../../schema';
import { AGENTCORE_SERVICE_PRINCIPAL } from '../../../../constants';
import type { IContainerAsset } from '../../../bundling';
import type { AgentCoreComponentProps } from '../../base-props';
import * as cdk from 'aws-cdk-lib';
import { aws_bedrockagentcore as bedrockagentcore, aws_iam as iam, aws_s3_assets as s3_assets } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Props for CodeZip artifact runtimes.
 */
export interface AgentCoreCodeZipRuntimeProps extends AgentCoreComponentProps {
  runtime: CodeZipRuntime;
  codeAsset: s3_assets.Asset;

  /**
   * Environment variables to set on the runtime.
   */
  environmentVariables?: Record<string, string>;
}

/**
 * Props for ContainerImage artifact runtimes.
 */
export interface AgentCoreContainerRuntimeProps extends AgentCoreComponentProps {
  runtime: ContainerImageRuntime;
  containerAsset: IContainerAsset;

  /**
   * Environment variables to set on the runtime.
   */
  environmentVariables?: Record<string, string>;
}

/**
 * Props for ReferencedEcrImage artifact runtimes.
 * References an existing ECR image without building.
 */
export interface AgentCoreReferencedImageRuntimeProps extends AgentCoreComponentProps {
  runtime: ReferencedEcrImageRuntime;

  /** The resolved ECR image URI */
  imageUri: string;

  /**
   * Environment variables to set on the runtime.
   */
  environmentVariables?: Record<string, string>;
}

/**
 * Union type for AgentCoreRuntime props.
 * Supports CodeZip, ContainerImage, or ReferencedEcrImage artifacts.
 */
export type AgentCoreRuntimeProps =
  | AgentCoreCodeZipRuntimeProps
  | AgentCoreContainerRuntimeProps
  | AgentCoreReferencedImageRuntimeProps;

/**
 * AgentCore Runtime component construct.
 * Creates a CfnRuntime resource based on the runtime configuration.
 *
 * Uses L1 constructs to ensure stable logical IDs and deterministic CloudFormation updates.
 *
 * Supports both CodeZip and ContainerImage artifacts:
 * - CodeZip: S3 bucket/key, Python runtime version, entry point
 * - ContainerImage: ECR container URI
 */
export class AgentCoreRuntime extends Construct {
  public readonly runtimeId: string;
  public readonly runtimeArn: string;
  public readonly roleArn: string;
  /** The IAM role used by this runtime. Used for granting permissions. */
  public readonly role: iam.Role;
  private readonly cfnRuntime: bedrockagentcore.CfnRuntime;

  constructor(scope: Construct, id: string, props: AgentCoreRuntimeProps) {
    super(scope, id);

    const { projectName, runtime, environmentVariables } = props;
    const runtimeName = `${projectName}_${runtime.name}`;

    this.role = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal(AGENTCORE_SERVICE_PRINCIPAL),
      description: 'AgentCore Runtime execution role',
    });
    this.roleArn = this.role.roleArn;

    // Grant Bedrock model invocation permissions
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      })
    );

    // Grant AgentCore Identity permissions for API key retrieval
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock-agentcore:CreateWorkloadIdentity',
          'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
          'bedrock-agentcore:GetApiKeyCredential',
          'bedrock-agentcore:GetResourceApiKey',
        ],
        resources: ['*'],
      })
    );

    // Grant Secrets Manager access for AgentCore Identity API keys
    // AgentCore Identity stores API keys in Secrets Manager with this naming pattern
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [`arn:aws:secretsmanager:*:${cdk.Stack.of(this).account}:secret:bedrock-agentcore-identity!*`],
      })
    );

    // Grant CloudWatch Logs permissions for runtime logging
    // DescribeLogGroups requires broader access to discover log groups
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:DescribeLogGroups'],
        resources: ['*'],
      })
    );

    // Other log actions can be scoped to the runtime's log group pattern
    // AgentCore creates log groups with pattern: /aws/bedrock-agentcore/runtimes/{runtimeName}-{suffix}-DEFAULT
    const logGroupArn = `arn:${cdk.Stack.of(this).partition}:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/bedrock-agentcore/runtimes/${runtimeName}*`;
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:DescribeLogStreams',
          'logs:PutLogEvents',
          'logs:GetLogEvents',
          'logs:FilterLogEvents',
        ],
        resources: [logGroupArn],
      })
    );

    // Build artifact configuration based on artifact type
    let agentRuntimeArtifact: bedrockagentcore.CfnRuntime.AgentRuntimeArtifactProperty;

    switch (runtime.artifact) {
      case 'CodeZip': {
        const { codeAsset } = props as AgentCoreCodeZipRuntimeProps;

        // Extract the file path from entrypoint (strip optional :handler suffix)
        const colonIndex = runtime.entrypoint.indexOf(':');
        const entrypointPath = colonIndex >= 0 ? runtime.entrypoint.substring(0, colonIndex) : runtime.entrypoint;

        // Build entryPoint array - wrap with opentelemetry-instrument if OTel is enabled
        const enableOtel = runtime.instrumentation?.enableOtel ?? true;
        const entryPoint = enableOtel ? ['opentelemetry-instrument', entrypointPath] : [entrypointPath];

        agentRuntimeArtifact = {
          codeConfiguration: {
            code: {
              s3: {
                bucket: codeAsset.s3BucketName,
                prefix: codeAsset.s3ObjectKey,
              },
            },
            entryPoint,
            runtime: runtime.pythonVersion,
          },
        };
        break;
      }
      case 'ContainerImage': {
        const { containerAsset } = props as AgentCoreContainerRuntimeProps;

        agentRuntimeArtifact = {
          containerConfiguration: {
            containerUri: containerAsset.imageUri,
          },
        };
        break;
      }
      case 'ReferencedEcrImage': {
        const { imageUri } = props as AgentCoreReferencedImageRuntimeProps;

        // Grant ECR pull permissions for the referenced image
        // Extract repository ARN from image URI: {account}.dkr.ecr.{region}.amazonaws.com/{repo}:{tag}
        // Regex stops at repo name, intentionally ignoring :tag or @sha256:digest suffix
        const ecrMatch = /^(\d+)\.dkr\.ecr\.([a-z0-9-]+)\.amazonaws\.com\/([^:@]+)/.exec(imageUri);

        if (!ecrMatch) {
          // Non-ECR or malformed URI; no IAM permissions added.
          // The image may still work if permissions are granted externally.
          agentRuntimeArtifact = {
            containerConfiguration: {
              containerUri: imageUri,
            },
          };
          break;
        }

        const [, accountId, region, repoName] = ecrMatch;
        const partition = cdk.Stack.of(this).partition;
        const repositoryArn = `arn:${partition}:ecr:${region}:${accountId}:repository/${repoName}`;

        // Grant authorization token (account-level, required for ECR auth)
        this.role.addToPolicy(
          new iam.PolicyStatement({
            actions: ['ecr:GetAuthorizationToken'],
            resources: ['*'],
          })
        );

        // Grant image pull permissions (repository-scoped)
        this.role.addToPolicy(
          new iam.PolicyStatement({
            actions: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer', 'ecr:BatchCheckLayerAvailability'],
            resources: [repositoryArn],
          })
        );

        agentRuntimeArtifact = {
          containerConfiguration: {
            containerUri: imageUri,
          },
        };
        break;
      }
    }

    // Create Runtime resource
    this.cfnRuntime = new bedrockagentcore.CfnRuntime(this, 'Resource', {
      agentRuntimeName: runtimeName,
      agentRuntimeArtifact,
      roleArn: this.roleArn,
      networkConfiguration: {
        networkMode: runtime.networkMode ?? 'PUBLIC',
      },
      environmentVariables,
      description: runtime.description ?? `AgentCore Runtime: ${runtimeName}`,
    });

    this.runtimeId = this.cfnRuntime.attrAgentRuntimeId;
    this.runtimeArn = this.cfnRuntime.attrAgentRuntimeArn;
  }

  /**
   * Add additional policy statements to the execution role.
   * Uses L2 construct pattern - accepts IAM PolicyStatement objects.
   */
  public addToPolicy(statement: iam.PolicyStatement): void {
    this.role.addToPolicy(statement);
  }

  /**
   * Grant a principal permission to invoke this runtime.
   * Adds bedrock-agentcore:InvokeAgentRuntime and InvokeAgentRuntimeForUser permissions.
   */
  public grantInvoke(grantee: iam.IGrantable): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee,
      actions: ['bedrock-agentcore:InvokeAgentRuntime', 'bedrock-agentcore:InvokeAgentRuntimeForUser'],
      resourceArns: [this.runtimeArn],
    });
  }

  /**
   * Add an environment variable to the runtime.
   * Merges with existing environment variables.
   */
  public addEnvironmentVariable(key: string, value: string): void {
    this.cfnRuntime.environmentVariables = {
      ...(this.cfnRuntime.environmentVariables ?? {}),
      [key]: value,
    };
  }
}
