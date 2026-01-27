import type { AgentEnvSpec, OwnedMemoryProvider } from '../../../schema';
import { exportName, outputId, toPascalId } from '../../logical-ids';
import { LocalDockerAsset, PythonBundledCodeZipAsset } from '../bundling';
import { AgentCoreMemory } from '../components/primitives/memory/AgentCoreMemory';
import { AgentCoreRuntime } from '../components/primitives/runtime/AgentCoreRuntime';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AgentEnvironmentProps {
  /**
   * The project name used as prefix for resource names.
   */
  projectName: string;

  /**
   * The AgentEnvSpec configuration for the agent.
   */
  spec: AgentEnvSpec;

  /**
   * The root path of the agentcore configuration directory.
   */
  configRoot: string;

  /**
   * Map of image reference names to ECR URIs.
   * From aws-targets.json referencedResources.ecrImages for the deployment target.
   */
  ecrImages?: Record<string, string>;
}

/**
 * Construct representing a single agent environment.
 * Creates runtime, memory, and outputs for one agent.
 */
export class AgentEnvironment extends Construct {
  public readonly runtime: AgentCoreRuntime;
  public readonly memories = new Map<string, AgentCoreMemory>();

  constructor(scope: Construct, id: string, props: AgentEnvironmentProps) {
    super(scope, id);

    const { projectName, spec, configRoot } = props;
    const { runtime: runtimeConfig } = spec;

    // Create runtime based on artifact type
    switch (runtimeConfig.artifact) {
      case 'CodeZip': {
        if (spec.targetLanguage !== 'Python') {
          throw new Error(`Bundling for ${spec.targetLanguage} is not yet implemented`);
        }

        const codeAsset = new PythonBundledCodeZipAsset(this, 'CodeAsset', {
          runtime: runtimeConfig,
        });

        this.runtime = new AgentCoreRuntime(this, 'Runtime', {
          projectName,
          runtime: runtimeConfig,
          codeAsset: codeAsset.asset,
        });
        break;
      }
      case 'ContainerImage': {
        if (runtimeConfig.buildMode === 'LOCAL') {
          const containerAsset = new LocalDockerAsset(this, 'ContainerAsset', {
            runtime: runtimeConfig,
            configRoot,
          });

          this.runtime = new AgentCoreRuntime(this, 'Runtime', {
            projectName,
            runtime: runtimeConfig,
            containerAsset,
          });
        } else {
          throw new Error('REMOTE container build mode is not yet implemented');
        }
        break;
      }
      case 'ReferencedEcrImage': {
        const imageRef = runtimeConfig.imageRef;
        const imageUri = props.ecrImages?.[imageRef];

        if (!imageUri) {
          throw new Error(
            `Runtime '${runtimeConfig.name}' references image '${imageRef}' ` +
              `but no URI is defined in aws-targets.json referencedResources.ecrImages for this target`
          );
        }

        this.runtime = new AgentCoreRuntime(this, 'Runtime', {
          projectName,
          runtime: runtimeConfig,
          imageUri,
        });
        break;
      }
    }

    // Wire identity provider
    this.wireIdentityProvider(spec);

    // Create Memory resources for owned memory providers
    const ownedMemoryProviders = spec.memoryProviders.filter(
      (provider): provider is OwnedMemoryProvider => provider.relation === 'own'
    );

    for (const provider of ownedMemoryProviders) {
      // Use toPascalId to convert dynamic memory names to valid construct IDs
      const memory = new AgentCoreMemory(this, toPascalId('Memory', provider.name), {
        projectName,
        provider,
      });

      // Grant runtime permissions to access this memory
      memory.grant(this.runtime);

      // Add memory ID to runtime environment
      this.runtime.addEnvironmentVariable(provider.envVarName, memory.memoryId);

      this.memories.set(provider.name, memory);
    }

    // Create CloudFormation outputs for this agent
    this.createOutputs(spec.name);
  }

  /**
   * Wire identity provider environment variables.
   * Sets the identity provider name env var for each configured identity provider.
   */
  private wireIdentityProvider(spec: AgentEnvSpec): void {
    for (const provider of spec.identityProviders) {
      this.runtime.addEnvironmentVariable(provider.envVarName, provider.name);
    }
  }

  /**
   * Creates CloudFormation outputs for this agent.
   * Output logical IDs are scoped by CDK's construct tree (parent is AgentEnvironment).
   */
  private createOutputs(agentName: string): void {
    const stack = Stack.of(this);

    new CfnOutput(this, outputId('RuntimeId'), {
      description: `Runtime ID for agent: ${agentName}`,
      value: this.runtime.runtimeId,
      exportName: exportName(stack.stackName, agentName, 'RuntimeId'),
    });

    new CfnOutput(this, outputId('RuntimeArn'), {
      description: `Runtime ARN for agent: ${agentName}`,
      value: this.runtime.runtimeArn,
      exportName: exportName(stack.stackName, agentName, 'RuntimeArn'),
    });

    new CfnOutput(this, outputId('RoleArn'), {
      description: `Execution Role ARN for agent: ${agentName}`,
      value: this.runtime.roleArn,
      exportName: exportName(stack.stackName, agentName, 'RoleArn'),
    });

    if (this.memories.size > 0) {
      const memoryIds = Array.from(this.memories.values()).map(m => m.memoryId);
      new CfnOutput(this, outputId('MemoryIds'), {
        description: `Memory IDs for agent: ${agentName}`,
        value: memoryIds.join(','),
        exportName: exportName(stack.stackName, agentName, 'MemoryIds'),
      });
    }
  }
}
