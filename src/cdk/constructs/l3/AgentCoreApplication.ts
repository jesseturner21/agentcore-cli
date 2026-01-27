import { findConfigRoot } from '../../../lib';
import type {
  AgentCoreAgentInvocation,
  AgentCoreProjectSpec,
  AgentEnvSpec,
  ReferencedMemoryProvider,
} from '../../../schema';
import { toPascalId } from '../../logical-ids';
import type { AgentCoreMemory } from '../components/primitives/memory/AgentCoreMemory';
import { AgentEnvironment } from './AgentEnvironment';
import { Construct } from 'constructs';

export interface AgentCoreApplicationProps {
  /**
   * The full project specification.
   */
  spec: AgentCoreProjectSpec;

  /**
   * Map of image reference names to ECR URIs.
   * From aws-targets.json referencedResources.ecrImages for the deployment target.
   */
  ecrImages?: Record<string, string>;
}

/**
 * AgentCore Application L3 Construct which defines multiple Agent Environments on AgentCore.
 * This construct models the AgentEnvSpec array in resources.
 * Because this construct needs stable graceful updates, only L1 CDK implementations are used.
 *
 * All child constructs use stable logical IDs derived from agent names
 * via the logical-ids utility to ensure deterministic CloudFormation updates.
 */
export class AgentCoreApplication extends Construct {
  /** Agent environments keyed by agent name */
  public readonly environments = new Map<string, AgentEnvironment>();

  constructor(scope: Construct, id: string, props: AgentCoreApplicationProps) {
    super(scope, id);

    const { spec } = props;
    const projectName = spec.name;

    // Resolve config root once for all environments
    const configRoot = findConfigRoot();
    if (!configRoot) {
      throw new Error('Could not find agentcore directory. Ensure you are running from within an AgentCore project.');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Create all agent environments
    // ═══════════════════════════════════════════════════════════════════
    for (const agentSpec of spec.agents) {
      const env = new AgentEnvironment(this, toPascalId('Agent', agentSpec.name), {
        projectName,
        spec: agentSpec,
        configRoot,
        ecrImages: props.ecrImages,
      });
      this.environments.set(agentSpec.name, env);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Wire cross-agent memory references
    // ═══════════════════════════════════════════════════════════════════
    this.wireMemoryReferences(spec.agents);

    // ═══════════════════════════════════════════════════════════════════
    // Wire agent-to-agent invocation references
    // ═══════════════════════════════════════════════════════════════════
    this.wireAgentInvocationReferences(spec.agents);
  }

  /**
   * Wire memory sharing between agents.
   * Grants consumer agents access to memories owned by other agents.
   * Also adds memory IDs to runtime environment variables.
   */
  private wireMemoryReferences(agentSpecs: AgentEnvSpec[]): void {
    for (const agentSpec of agentSpecs) {
      const env = this.environments.get(agentSpec.name)!;
      for (const provider of this.getReferencedMemoryProviders(agentSpec)) {
        const memory = this.findMemoryByName(provider.name);
        memory.grantToConsumer(env.runtime, provider.access, provider.namespaces);

        // Add memory ID to runtime environment
        env.runtime.addEnvironmentVariable(provider.envVarName, memory.memoryId);
      }
    }
  }

  /**
   * Get memory providers that reference memories owned by other agents.
   */
  private getReferencedMemoryProviders(spec: AgentEnvSpec): ReferencedMemoryProvider[] {
    return spec.memoryProviders.filter((p): p is ReferencedMemoryProvider => p.relation === 'use');
  }

  /**
   * Find a memory by name across all agent environments.
   */
  private findMemoryByName(name: string): AgentCoreMemory {
    for (const env of this.environments.values()) {
      const memory = env.memories.get(name);
      if (memory) return memory;
    }
    throw new Error(`Memory "${name}" not found. Ensure an agent owns this memory.`);
  }

  /**
   * Wire agent-to-agent invocation references.
   * Grants InvokeAgentRuntime permission and sets environment variable with target agent's runtime ARN.
   */
  private wireAgentInvocationReferences(agentSpecs: AgentEnvSpec[]): void {
    for (const agentSpec of agentSpecs) {
      const sourceEnv = this.environments.get(agentSpec.name)!;

      const agentRefs = agentSpec.remoteTools.filter(
        (tool): tool is AgentCoreAgentInvocation => tool.type === 'AgentCoreAgentInvocation'
      );

      for (const ref of agentRefs) {
        const targetEnv = this.environments.get(ref.targetAgentName);
        if (!targetEnv) {
          throw new Error(
            `Agent "${ref.targetAgentName}" referenced by "${agentSpec.name}" not found. ` +
              `Ensure the target agent is defined in the project.`
          );
        }

        // Grant invoke permission on target agent's runtime
        targetEnv.runtime.grantInvoke(sourceEnv.runtime.role);

        // Add target runtime ARN to source agent's environment variables
        sourceEnv.runtime.addEnvironmentVariable(ref.envVarName, targetEnv.runtime.runtimeArn);
      }
    }
  }
}
