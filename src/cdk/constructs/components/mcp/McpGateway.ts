import type { AgentCoreGateway, AgentCoreGatewayTarget } from '../../../../schema';
import { AGENTCORE_SERVICE_PRINCIPAL } from '../../../constants';
import { toPascalId } from '../../../logical-ids';
import type { AgentCoreComponentProps } from '../base-props';
import { AgentCoreRuntime } from '../primitives/runtime/AgentCoreRuntime';
import { McpLambdaCompute } from './McpLambdaCompute';
import { McpRuntimeCompute } from './McpRuntimeCompute';
import { aws_bedrockagentcore as bedrockagentcore, aws_iam as iam, aws_lambda as lambda } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface McpGatewayProps extends AgentCoreComponentProps {
  /** Gateway configuration from schema */
  readonly gateway: AgentCoreGateway;
  /** Config root directory for resolving paths */
  readonly configRoot: string;
}

/**
 * Creates an MCP Gateway with its associated targets and compute.
 *
 * This component orchestrates:
 * - CfnGateway resource creation with optional JWT authorization
 * - Gateway IAM role
 * - Gateway targets (Lambda or AgentCoreRuntime backed)
 * - Proper IAM grants between gateway and compute
 */
export class McpGateway extends Construct {
  public readonly cfnGateway: bedrockagentcore.CfnGateway;
  public readonly role: iam.Role;
  public readonly runtimes = new Map<string, AgentCoreRuntime>();
  public readonly lambdaFunctions = new Map<string, lambda.Function>();

  constructor(scope: Construct, id: string, props: McpGatewayProps) {
    super(scope, id);

    const { gateway, projectName, configRoot } = props;

    // Create IAM role for the gateway
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal(AGENTCORE_SERVICE_PRINCIPAL),
      description: `Gateway role for: ${gateway.name}`,
    });

    // Create the Gateway resource
    const gatewayResourceName = `${projectName}-${gateway.name}`;
    const authorizerType = gateway.authorizerType ?? 'NONE';

    // Build authorizer configuration if using CUSTOM_JWT
    const authorizerConfiguration = this.buildAuthorizerConfiguration(gateway, authorizerType);

    this.cfnGateway = new bedrockagentcore.CfnGateway(this, 'Resource', {
      authorizerType,
      name: gatewayResourceName,
      protocolType: 'MCP',
      roleArn: this.role.roleArn,
      description: gateway.description ?? `MCP Gateway for ${gatewayResourceName}`,
      authorizerConfiguration,
    });

    // Process gateway targets
    for (const target of gateway.targets) {
      this.createGatewayTarget(target, projectName, configRoot);
    }
  }

  /**
   * Builds the authorizer configuration for a gateway.
   * URL format is validated at schema level via OidcDiscoveryUrlSchema.
   */
  private buildAuthorizerConfiguration(
    gateway: AgentCoreGateway,
    authorizerType: string
  ): bedrockagentcore.CfnGateway.AuthorizerConfigurationProperty | undefined {
    if (authorizerType !== 'CUSTOM_JWT' || !gateway.authorizerConfiguration?.customJwtAuthorizer) {
      return undefined;
    }

    const jwtConfig = gateway.authorizerConfiguration.customJwtAuthorizer;

    return {
      customJwtAuthorizer: {
        discoveryUrl: jwtConfig.discoveryUrl,
        allowedAudience: jwtConfig.allowedAudience,
        allowedClients: jwtConfig.allowedClients,
      },
    };
  }

  /**
   * Creates a Gateway Target with its associated compute.
   */
  private createGatewayTarget(target: AgentCoreGatewayTarget, projectName: string, configRoot: string): void {
    const targetName = target.name;

    if (!target.compute) {
      throw new Error(
        `Gateway target "${targetName}" must specify compute configuration. ` +
          `Supported compute hosts: Lambda, AgentCoreRuntime`
      );
    }

    // Configure credential provider to use the gateway's IAM role
    const credentialProviderConfigurations: bedrockagentcore.CfnGatewayTarget.CredentialProviderConfigurationProperty[] =
      [{ credentialProviderType: 'GATEWAY_IAM_ROLE' }];

    const computeHost = target.compute.host;
    let targetConfiguration: bedrockagentcore.CfnGatewayTarget.TargetConfigurationProperty;

    switch (computeHost) {
      case 'Lambda': {
        // Use toPascalId to convert dynamic target names to valid construct IDs
        const lambdaCompute = new McpLambdaCompute(this, toPascalId('Lambda', targetName), {
          toolName: targetName,
          compute: target.compute,
          projectName,
          configRoot,
        });

        // Store reference and grant gateway invoke permission
        this.lambdaFunctions.set(targetName, lambdaCompute.lambdaFunction);
        lambdaCompute.lambdaFunction.grantInvoke(this.role);

        // Build tool schema payload for all tools in this target
        const toolSchemaPayloads = target.toolDefinitions.map(toolDef => {
          const payload: {
            name: string;
            description: string;
            inputSchema: typeof toolDef.inputSchema;
            outputSchema?: typeof toolDef.outputSchema;
          } = {
            name: toolDef.name,
            description: toolDef.description,
            inputSchema: toolDef.inputSchema,
          };
          if (toolDef.outputSchema) {
            payload.outputSchema = toolDef.outputSchema;
          }
          return payload;
        });

        targetConfiguration = {
          mcp: {
            lambda: {
              lambdaArn: lambdaCompute.lambdaFunction.functionArn,
              toolSchema: { inlinePayload: toolSchemaPayloads },
            },
          },
        };
        break;
      }
      case 'AgentCoreRuntime': {
        // Use toPascalId to convert dynamic target names to valid construct IDs
        const runtimeCompute = new McpRuntimeCompute(this, toPascalId('Runtime', targetName), {
          toolName: targetName,
          compute: target.compute,
          projectName,
        });

        // Store reference and grant gateway invoke permission
        this.runtimes.set(targetName, runtimeCompute.runtime);
        runtimeCompute.grantInvoke(this.role);

        targetConfiguration = {
          mcp: {
            mcpServer: { endpoint: runtimeCompute.endpointUrl },
          },
        };
        break;
      }
      default: {
        const _exhaustive: never = computeHost;
        throw new Error(`Unsupported compute host: ${String(_exhaustive)}`);
      }
    }

    // Concatenate tool descriptions for target description (max 200 chars)
    const targetDescription = target.toolDefinitions
      .map(t => t.description)
      .join('; ')
      .slice(0, 200);

    // Use toPascalId to convert dynamic target names to valid construct IDs
    void new bedrockagentcore.CfnGatewayTarget(this, toPascalId('Target', targetName), {
      credentialProviderConfigurations,
      name: targetName,
      targetConfiguration,
      description: targetDescription,
      gatewayIdentifier: this.cfnGateway.attrGatewayIdentifier,
    });
  }
}
