import { resolveCodeLocation } from '../../../../lib';
import type {
  CodeToolImplementationBinding,
  CodeZipRuntime,
  ContainerToolImplementationBinding,
  DirectoryPath,
  FilePath,
  LambdaComputeConfig,
} from '../../../../schema';
import { LAMBDA_SERVICE_PRINCIPAL } from '../../../constants';
import { PythonBundledCodeZipAsset } from '../../bundling';
import type { AgentCoreComponentProps } from '../base-props';
import { DEFAULT_MCP_PYTHON_VERSION, mapPythonRuntime } from './mcp-utils';
import { Duration, aws_iam as iam, aws_lambda as lambda } from 'aws-cdk-lib';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface McpLambdaComputeProps extends AgentCoreComponentProps {
  /** Name of the tool this compute is for */
  readonly toolName: string;
  /** Lambda compute configuration from schema */
  readonly compute: LambdaComputeConfig;
  /** Config root directory for resolving paths */
  readonly configRoot: string;
}

/**
 * Creates Lambda-backed compute for an MCP tool.
 *
 * Supports three implementation types:
 * - TypeScript: Code bundle with Node.js runtime (not yet implemented)
 * - Python: Code bundle with Python runtime
 * - Other: Container image (DockerImageFunction)
 */
export class McpLambdaCompute extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: McpLambdaComputeProps) {
    super(scope, id);

    const { toolName, compute, projectName: _projectName, configRoot } = props;

    // Create Lambda execution role
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal(LAMBDA_SERVICE_PRINCIPAL),
      description: `Execution role for MCP tool: ${toolName}`,
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    // Add user-specified IAM policy if provided
    if (compute.iamPolicy) {
      this.role.attachInlinePolicy(
        new iam.Policy(this, 'Policy', {
          document: iam.PolicyDocument.fromJson(compute.iamPolicy),
        })
      );
    }

    // Create function based on implementation type
    switch (compute.implementation.language) {
      case 'TypeScript': {
        if (!compute.nodeVersion) {
          throw new Error(`Lambda compute for tool "${toolName}" with TypeScript must specify nodeVersion`);
        }
        throw new Error(`Lambda bundling only supports Python currently. Tool "${toolName}" uses TypeScript`);
      }
      case 'Python': {
        this.lambdaFunction = this.createPythonLambda(props);
        break;
      }
      case 'Other': {
        this.lambdaFunction = this.createContainerLambda(props, configRoot);
        break;
      }
    }
  }

  /**
   * Creates a Python Lambda function with bundled code.
   */
  private createPythonLambda(props: McpLambdaComputeProps): lambda.Function {
    const { toolName, compute, projectName } = props;

    if (!compute.pythonVersion) {
      throw new Error(`Lambda compute for tool "${toolName}" with Python must specify pythonVersion`);
    }

    const runtimeString = mapPythonRuntime(compute.pythonVersion);
    const codeImpl = compute.implementation as CodeToolImplementationBinding;

    const codeZipRuntime = this.createCodeZipRuntime(toolName, compute);
    const bundledAsset = new PythonBundledCodeZipAsset(this, 'CodeAsset', {
      runtime: codeZipRuntime,
    });

    return new lambda.Function(this, 'Function', {
      functionName: `${projectName}-${toolName}`,
      runtime: lambda.Runtime.ALL.find(r => r.name === runtimeString) ?? lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      role: this.role,
      handler: codeImpl.handler,
      code: lambda.Code.fromBucket(bundledAsset.asset.bucket, bundledAsset.asset.s3ObjectKey),
      timeout: Duration.seconds(compute.timeout ?? 30),
      memorySize: compute.memorySize ?? 512,
    });
  }

  /**
   * Creates a container-based Lambda function using DockerImageFunction.
   */
  private createContainerLambda(props: McpLambdaComputeProps, configRoot: string): lambda.Function {
    const { toolName, compute, projectName } = props;
    const containerImpl = compute.implementation as ContainerToolImplementationBinding;

    if (containerImpl.buildMode === 'REMOTE') {
      throw new Error('REMOTE container build mode is not yet implemented');
    }

    // LOCAL mode: Build Docker image and push to ECR
    const buildContext = resolveCodeLocation(containerImpl.buildContextPath, configRoot);
    const dockerImageAsset = new DockerImageAsset(this, 'DockerImage', {
      directory: buildContext,
      file: containerImpl.dockerfilePath,
    });

    return new DockerImageFunction(this, 'Function', {
      functionName: `${projectName}-${toolName}`,
      code: DockerImageCode.fromEcr(dockerImageAsset.repository, {
        tagOrDigest: dockerImageAsset.imageTag,
      }),
      architecture: lambda.Architecture.ARM_64,
      role: this.role,
      timeout: Duration.seconds(compute.timeout ?? 30),
      memorySize: compute.memorySize ?? 512,
    });
  }

  /**
   * Creates a CodeZipRuntime configuration for bundling.
   */
  private createCodeZipRuntime(toolName: string, compute: LambdaComputeConfig): CodeZipRuntime {
    const { implementation } = compute;

    if (implementation.language === 'Other') {
      throw new Error(`Cannot create CodeZipRuntime for container-based implementation`);
    }

    const codeImpl = implementation;
    const pythonVersion = compute.pythonVersion ?? DEFAULT_MCP_PYTHON_VERSION;

    return {
      artifact: 'CodeZip',
      pythonVersion,
      name: toolName,
      entrypoint: codeImpl.handler as FilePath,
      codeLocation: codeImpl.path as DirectoryPath,
      networkMode: 'PUBLIC',
    };
  }
}
