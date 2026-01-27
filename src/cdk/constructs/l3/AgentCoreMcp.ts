import { findConfigRoot } from '../../../lib';
import type { AgentCoreMcpRuntimeTool, AgentCoreProjectSpec, AgentEnvSpec } from '../../../schema';
import { exportName, outputId, toPascalId } from '../../logical-ids';
import { McpGateway, McpRuntimeCompute, getRuntimeEndpointUrl } from '../components/mcp';
import { AgentCoreRuntime } from '../components/primitives/runtime/AgentCoreRuntime';
import type { AgentCoreApplication } from './AgentCoreApplication';
import { CfnOutput, Stack, aws_bedrockagentcore as bedrockagentcore, aws_lambda as lambda } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AgentCoreMcpProps {
  /**
   * The full project specification.
   */
  spec: AgentCoreProjectSpec;

  /**
   * Optional AgentCoreApplication instance.
   * If provided, gateway URLs will be wired into agent runtime environment variables.
   * Optional because MCP resources can exist without agents.
   */
  agentCoreApplication?: AgentCoreApplication;
}

/**
 * AgentCore MCP L3 Construct which defines MCP infrastructure on AgentCore.
 *
 * This construct orchestrates:
 * - MCP Gateways with their targets (via McpGateway component)
 * - MCP Runtime tools (via McpRuntimeCompute component)
 * - Wiring gateway URLs to agent environments
 * - Wiring MCP runtime references to agent environments
 * - CloudFormation outputs for all MCP resources
 */
export class AgentCoreMcp extends Construct {
  public readonly gateways = new Map<string, bedrockagentcore.CfnGateway>();
  public readonly runtimes = new Map<string, AgentCoreRuntime>();
  public readonly lambdaFunctions = new Map<string, lambda.Function>();

  private readonly mcpGateways = new Map<string, McpGateway>();
  private readonly configRoot: string;
  private readonly projectName: string;

  constructor(scope: Construct, id: string, props: AgentCoreMcpProps) {
    super(scope, id);

    const { spec, agentCoreApplication } = props;
    const mcpSpec = spec.mcp;
    if (!mcpSpec) {
      throw new Error('AgentCoreMcp requires spec.mcp to be defined');
    }

    this.projectName = spec.name;

    // Find config root once for path resolution
    const configRoot = findConfigRoot();
    if (!configRoot) {
      throw new Error('Could not find agentcore directory. Ensure you are running from within an AgentCore project.');
    }
    this.configRoot = configRoot;

    // Process gateways using McpGateway component
    for (const gateway of mcpSpec.agentCoreGateways) {
      // Use toPascalId to convert dynamic gateway names to valid construct IDs
      const mcpGateway = new McpGateway(this, toPascalId('Gateway', gateway.name), {
        gateway,
        projectName: this.projectName,
        configRoot: this.configRoot,
      });

      // Store references for outputs and wiring
      this.mcpGateways.set(gateway.name, mcpGateway);
      this.gateways.set(gateway.name, mcpGateway.cfnGateway);

      // Aggregate runtimes and lambdas from gateway
      for (const [name, runtime] of mcpGateway.runtimes) {
        this.runtimes.set(name, runtime);
      }
      for (const [name, fn] of mcpGateway.lambdaFunctions) {
        this.lambdaFunctions.set(name, fn);
      }
    }

    // Process MCP runtime tools using McpRuntimeCompute component
    if (mcpSpec.mcpRuntimeTools) {
      for (const tool of mcpSpec.mcpRuntimeTools) {
        this.createMcpRuntimeTool(tool);
      }
    }

    // Wire gateway URLs to agent runtimes if application provided
    if (agentCoreApplication) {
      this.wireGatewayUrlsToAgents(agentCoreApplication, spec.agents);
      this.wireMcpRuntimeReferences(agentCoreApplication, mcpSpec.mcpRuntimeTools ?? []);
    }

    // Create CloudFormation outputs for MCP resources
    this.createOutputs();
  }

  // ==================== Public Getters ====================

  /**
   * Get the runtime ARN for a specific tool.
   */
  public getRuntimeArn(toolName: string): string | undefined {
    return this.runtimes.get(toolName)?.runtimeArn;
  }

  /**
   * Get the runtime ID for a specific tool.
   */
  public getRuntimeId(toolName: string): string | undefined {
    return this.runtimes.get(toolName)?.runtimeId;
  }

  /**
   * Get the runtime endpoint URL for a specific tool.
   */
  public getRuntimeEndpoint(toolName: string): string | undefined {
    const runtime = this.runtimes.get(toolName);
    if (!runtime) return undefined;
    return getRuntimeEndpointUrl(runtime.runtimeArn);
  }

  // ==================== Private Methods ====================

  /**
   * Creates an MCP Runtime tool (not behind a Gateway).
   * Directly addressable by agents via the generated DNS endpoint.
   */
  private createMcpRuntimeTool(tool: AgentCoreMcpRuntimeTool): void {
    const compute = tool.compute;

    if (!compute.runtime) {
      throw new Error(`MCP runtime tool "${tool.name}" must specify runtime configuration`);
    }

    // Use toPascalId to convert dynamic tool names to valid construct IDs
    const runtimeCompute = new McpRuntimeCompute(this, toPascalId('McpRuntime', tool.name), {
      toolName: tool.name,
      compute,
      projectName: this.projectName,
    });

    this.runtimes.set(tool.name, runtimeCompute.runtime);
  }

  /**
   * Creates CloudFormation outputs for MCP resources.
   * Uses toPascalId to convert dynamic names to valid output IDs.
   */
  private createOutputs(): void {
    const stack = Stack.of(this);

    // Gateway outputs
    for (const [gatewayName, gateway] of this.gateways) {
      new CfnOutput(this, outputId(toPascalId('Gateway', gatewayName), 'Id'), {
        description: `Gateway ID for: ${gatewayName}`,
        value: gateway.attrGatewayIdentifier,
        exportName: exportName(stack.stackName, 'Gateway', gatewayName, 'Id'),
      });

      new CfnOutput(this, outputId(toPascalId('Gateway', gatewayName), 'Arn'), {
        description: `Gateway ARN for: ${gatewayName}`,
        value: gateway.attrGatewayArn,
        exportName: exportName(stack.stackName, 'Gateway', gatewayName, 'Arn'),
      });
    }

    // Runtime outputs (for MCP tools using AgentCore Runtime)
    for (const [toolName, runtime] of this.runtimes) {
      new CfnOutput(this, outputId(toPascalId('McpRuntime', toolName), 'Id'), {
        description: `MCP Runtime ID for tool: ${toolName}`,
        value: runtime.runtimeId,
        exportName: exportName(stack.stackName, 'McpRuntime', toolName, 'Id'),
      });

      new CfnOutput(this, outputId(toPascalId('McpRuntime', toolName), 'Arn'), {
        description: `MCP Runtime ARN for tool: ${toolName}`,
        value: runtime.runtimeArn,
        exportName: exportName(stack.stackName, 'McpRuntime', toolName, 'Arn'),
      });

      const endpoint = this.getRuntimeEndpoint(toolName);
      if (endpoint) {
        new CfnOutput(this, outputId(toPascalId('McpRuntime', toolName), 'Endpoint'), {
          description: `MCP Runtime Endpoint for tool: ${toolName}`,
          value: endpoint,
          exportName: exportName(stack.stackName, 'McpRuntime', toolName, 'Endpoint'),
        });
      }
    }

    // Lambda outputs
    for (const [toolName, lambdaFn] of this.lambdaFunctions) {
      new CfnOutput(this, outputId(toPascalId('McpLambda', toolName), 'Arn'), {
        description: `Lambda ARN for MCP tool: ${toolName}`,
        value: lambdaFn.functionArn,
        exportName: exportName(stack.stackName, 'McpLambda', toolName, 'Arn'),
      });

      new CfnOutput(this, outputId(toPascalId('McpLambda', toolName), 'Name'), {
        description: `Lambda Name for MCP tool: ${toolName}`,
        value: lambdaFn.functionName,
        exportName: exportName(stack.stackName, 'McpLambda', toolName, 'Name'),
      });
    }
  }

  /**
   * Wire gateway URLs to agent runtimes as environment variables.
   */
  private wireGatewayUrlsToAgents(application: AgentCoreApplication, agentSpecs: AgentEnvSpec[]): void {
    for (const agentSpec of agentSpecs) {
      const env = application.environments.get(agentSpec.name);
      if (!env) continue;

      for (const mcpProvider of agentSpec.mcpProviders) {
        const gateway = this.gateways.get(mcpProvider.gatewayName);
        if (!gateway) {
          throw new Error(
            `Gateway "${mcpProvider.gatewayName}" referenced by agent "${agentSpec.name}" not found. ` +
              `Ensure the gateway is defined in the MCP spec.`
          );
        }

        env.runtime.addEnvironmentVariable(mcpProvider.envVarName, gateway.attrGatewayUrl);
      }
    }
  }

  /**
   * Wire MCP runtime tool bindings to agent runtimes.
   * Iterates through MCP runtime tools and their bindings, granting
   * InvokeAgentRuntime permission and setting environment variable with runtime ARN.
   */
  private wireMcpRuntimeReferences(
    application: AgentCoreApplication,
    mcpRuntimeTools: AgentCoreMcpRuntimeTool[]
  ): void {
    for (const tool of mcpRuntimeTools) {
      const runtime = this.runtimes.get(tool.name);
      if (!runtime) continue;

      const bindings = tool.bindings ?? [];
      for (const binding of bindings) {
        const env = application.environments.get(binding.agentName);
        if (!env) {
          throw new Error(
            `Agent "${binding.agentName}" bound to MCP runtime "${tool.name}" not found. ` +
              `Ensure the agent is defined in the project.`
          );
        }

        // Grant invoke permission and set environment variable with runtime ARN
        runtime.grantInvoke(env.runtime.role);
        env.runtime.addEnvironmentVariable(binding.envVarName, runtime.runtimeArn);
      }
    }
  }
}
