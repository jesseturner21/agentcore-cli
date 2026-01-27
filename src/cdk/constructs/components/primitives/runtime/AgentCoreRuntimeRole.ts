import type { AgentEnvSpec } from '../../../../../schema';
import { AGENTCORE_SERVICE_PRINCIPAL } from '../../../../constants';
import type { AgentCoreComponentProps } from '../../base-props';
import { aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AgentCoreRuntimeRoleProps extends AgentCoreComponentProps {
  spec: AgentEnvSpec;
  artifactBucket?: string;
}

/**
 * IAM Role for AgentCore Runtime execution.
 * Uses L2 IAM constructs for cleaner policy management.
 * Placeholder construct - permissions to be implemented.
 */
export class AgentCoreRuntimeRole extends Construct {
  public readonly role: iam.Role;
  public readonly roleArn: string;

  constructor(scope: Construct, id: string, _props: AgentCoreRuntimeRoleProps) {
    super(scope, id);

    // TODO: Add scoped IAM permissions based on spec in future commit
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal(AGENTCORE_SERVICE_PRINCIPAL),
      description: 'AgentCore Runtime execution role',
    });

    this.roleArn = this.role.roleArn;
  }

  /**
   * Add additional policy statements to the role.
   * Uses L2 construct pattern - accepts IAM PolicyStatement objects.
   */
  public addToPolicy(statement: iam.PolicyStatement): void {
    this.role.addToPolicy(statement);
  }
}
