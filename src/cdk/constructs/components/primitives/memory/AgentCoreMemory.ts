import type { Access, AgentCoreMemoryProvider } from '../../../../../schema';
import { AGENTCORE_SERVICE_PRINCIPAL } from '../../../../constants';
import type { AgentCoreComponentProps } from '../../base-props';
import type { AgentCoreRuntime } from '../runtime/AgentCoreRuntime';
import { aws_bedrockagentcore as bedrockagentcore, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Memory IAM actions that support the bedrock-agentcore:namespace condition key.
 * These actions can be scoped to specific namespaces for fine-grained access control.
 * @see https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrockagentcore.html
 */
const NAMESPACE_SCOPED_ACTIONS = ['bedrock-agentcore:ListMemoryRecords', 'bedrock-agentcore:RetrieveMemoryRecords'];

/**
 * Memory IAM read actions that do NOT support namespace scoping.
 * @see https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrockagentcore.html
 */
const READ_ACTIONS = [
  'bedrock-agentcore:GetEvent',
  'bedrock-agentcore:GetMemory',
  'bedrock-agentcore:GetMemoryRecord',
  'bedrock-agentcore:ListActors',
  'bedrock-agentcore:ListEvents',
  'bedrock-agentcore:ListSessions',
];

/**
 * Memory IAM write actions that do NOT support namespace scoping.
 * @see https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrockagentcore.html
 */
const WRITE_ACTIONS = [
  'bedrock-agentcore:CreateEvent',
  'bedrock-agentcore:DeleteEvent',
  'bedrock-agentcore:DeleteMemoryRecord',
];

export interface AgentCoreMemoryProps extends AgentCoreComponentProps {
  /**
   * The memory provider configuration from the AgentEnvSpec.
   * This is a schema sub-type that defines all resource semantics.
   */
  provider: AgentCoreMemoryProvider;
}

/**
 * AgentCore Memory component construct.
 * Creates a CfnMemory resource based on the provider configuration.
 *
 * Uses L1 constructs to ensure stable logical IDs and deterministic CloudFormation updates.
 *
 * Required properties from config:
 * - eventExpiryDuration: Days before events expire (7-365)
 * - memoryStrategies: Array of memory strategy configurations
 *
 * Optional properties:
 * - description: Memory description (from provider.description or config.description)
 * - memoryExecutionRoleArn: IAM role for memory execution
 *
 * CloudFormation maps each strategy type to a separate property:
 * - SEMANTIC -> semanticMemoryStrategy
 * - SUMMARIZATION -> summaryMemoryStrategy
 * - USER_PREFERENCE -> userPreferenceMemoryStrategy
 * - CUSTOM -> customMemoryStrategy
 */
export class AgentCoreMemory extends Construct {
  public readonly memoryId: string;
  public readonly memoryArn: string;
  private readonly memory: bedrockagentcore.CfnMemory;
  private readonly role: iam.Role;
  private readonly provider: AgentCoreMemoryProvider;

  constructor(scope: Construct, id: string, props: AgentCoreMemoryProps) {
    super(scope, id);

    const { projectName, provider } = props;
    this.provider = provider;
    const { config } = provider;
    const memoryName = `${projectName}_${provider.name}`;

    this.role = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal(AGENTCORE_SERVICE_PRINCIPAL),
      description: 'AgentCore Memory execution role',
    });

    // Map memory strategies to CloudFormation format
    // CloudFormation MemoryStrategyProperty has optional properties for each strategy type
    // Each strategy in the array should be a single object with one property set
    const memoryStrategies: bedrockagentcore.CfnMemory.MemoryStrategyProperty[] = config.memoryStrategies.map(
      strategy => {
        // Default strategy name: <providerName>-<StrategyType> (e.g., MyMemory-Semantic)
        const formattedType = strategy.type.charAt(0) + strategy.type.slice(1).toLowerCase().replace(/_/g, '');
        const strategyName = strategy.name ?? `${provider.name}_${formattedType}`;

        // Build the base strategy properties that are common across all types
        const baseStrategyProps = {
          name: strategyName,
          ...(strategy.description && { description: strategy.description }),
          ...(strategy.namespaces && { namespaces: strategy.namespaces }),
        };

        switch (strategy.type) {
          case 'SEMANTIC':
            return {
              semanticMemoryStrategy: baseStrategyProps,
            } as bedrockagentcore.CfnMemory.MemoryStrategyProperty;
          case 'SUMMARIZATION':
            return {
              summaryMemoryStrategy: baseStrategyProps,
            } as bedrockagentcore.CfnMemory.MemoryStrategyProperty;
          case 'USER_PREFERENCE':
            return {
              userPreferenceMemoryStrategy: baseStrategyProps,
            } as bedrockagentcore.CfnMemory.MemoryStrategyProperty;
          case 'CUSTOM':
            return {
              customMemoryStrategy: baseStrategyProps,
            } as bedrockagentcore.CfnMemory.MemoryStrategyProperty;
        }
      }
    );

    // Create Memory resource
    this.memory = new bedrockagentcore.CfnMemory(this, 'Resource', {
      name: memoryName,
      eventExpiryDuration: config.eventExpiryDuration,
      memoryStrategies,
      description: config.description ?? provider.description,
      memoryExecutionRoleArn: this.role.roleArn,
    });

    this.memoryId = this.memory.attrMemoryId;
    this.memoryArn = this.memory.attrMemoryArn;
  }

  /**
   * Collect namespaces from all memory strategies and convert to IAM-compatible patterns.
   * Template variables like {actorId} are converted to wildcards (*) for IAM StringLike conditions.
   * Returns converted namespaces if any, otherwise undefined.
   */
  private collectNamespaces(): string[] | undefined {
    const namespaces: string[] = [];
    for (const strategy of this.provider.config.memoryStrategies) {
      if (strategy.namespaces) {
        namespaces.push(...strategy.namespaces);
      }
    }
    if (namespaces.length === 0) {
      return undefined;
    }
    // Convert template variables (e.g., {actorId}, {sessionId}) to wildcards for IAM conditions
    return namespaces.map(ns => ns.replace(/\{[^}]+\}/g, '*'));
  }

  /**
   * Grant full memory permissions (read + write) to the owner runtime.
   * Uses namespaces from the owner's strategy config for namespace-scoped actions.
   */
  public grant(runtime: AgentCoreRuntime): void {
    this.grantAccess(runtime, 'readwrite', this.collectNamespaces());
  }

  /**
   * Grant memory permissions to a consumer runtime.
   * @param runtime - The consumer's runtime to grant permissions to
   * @param access - Access level: 'read' or 'readwrite' (default: 'readwrite')
   * @param namespaces - Specific namespaces to scope access to (optional)
   */
  public grantToConsumer(runtime: AgentCoreRuntime, access: Access = 'readwrite', namespaces?: string[]): void {
    this.grantAccess(runtime, access, namespaces);
  }

  /**
   * Internal method to grant permissions with specified access and optional namespace scoping.
   *
   * Creates policy statements for:
   * 1. Namespace-scoped actions (ListMemoryRecords, RetrieveMemoryRecords) - with condition if namespaces provided
   * 2. Non-namespace actions - always granted without conditions
   *
   * Write actions (CreateEvent, DeleteEvent, DeleteMemoryRecord) are only included for 'readwrite' access.
   */
  private grantAccess(runtime: AgentCoreRuntime, access: Access, namespaces?: string[]): void {
    // Non-namespace actions based on access level
    const nonNamespaceActions = access === 'read' ? READ_ACTIONS : [...READ_ACTIONS, ...WRITE_ACTIONS];

    // Grant namespace-scoped actions (ListMemoryRecords, RetrieveMemoryRecords)
    // These are read actions, so always included regardless of access level
    if (namespaces && namespaces.length > 0) {
      // Scope to specific namespaces
      runtime.addToPolicy(
        new iam.PolicyStatement({
          actions: NAMESPACE_SCOPED_ACTIONS,
          resources: [this.memoryArn],
          conditions: {
            StringLike: {
              'bedrock-agentcore:namespace': namespaces,
            },
          },
        })
      );
    } else {
      // No namespace restriction
      runtime.addToPolicy(
        new iam.PolicyStatement({
          actions: NAMESPACE_SCOPED_ACTIONS,
          resources: [this.memoryArn],
        })
      );
    }

    // Grant non-namespace actions (no condition support)
    runtime.addToPolicy(
      new iam.PolicyStatement({
        actions: nonNamespaceActions,
        resources: [this.memoryArn],
      })
    );
  }
}
