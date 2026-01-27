import { ConfigIO } from '../../../lib';
import type { AgentCoreProjectSpec, AwsDeploymentTargets, DeployedState } from '../../../schema';
import { invokeAgentRuntime } from '../../aws';

export interface InvokeContext {
  project: AgentCoreProjectSpec;
  deployedState: DeployedState;
  awsTargets: AwsDeploymentTargets;
}

/**
 * Loads configuration required for invocation
 */
export async function loadInvokeConfig(configIO: ConfigIO = new ConfigIO()): Promise<InvokeContext> {
  return {
    project: await configIO.readProjectSpec(),
    deployedState: await configIO.readDeployedState(),
    awsTargets: await configIO.readAWSDeploymentTargets(),
  };
}

export interface InvokeOptions {
  agentName?: string;
  targetName?: string;
  prompt?: string;
}

export interface InvokeResult {
  success: boolean;
  agentName?: string;
  targetName?: string;
  response?: string;
  error?: string;
}

/**
 * Main invoke handler
 */
export async function handleInvoke(context: InvokeContext, options: InvokeOptions = {}): Promise<InvokeResult> {
  const { project, deployedState, awsTargets } = context;

  // Resolve target
  const targetNames = Object.keys(deployedState.targets);
  if (targetNames.length === 0) {
    return { success: false, error: 'No deployed targets found. Run `agentcore deploy` first.' };
  }

  const selectedTargetName = options.targetName ?? targetNames[0]!;

  if (options.targetName && !targetNames.includes(options.targetName)) {
    return { success: false, error: `Target '${options.targetName}' not found. Available: ${targetNames.join(', ')}` };
  }

  const targetState = deployedState.targets[selectedTargetName];
  const targetConfig = awsTargets.find(t => t.name === selectedTargetName);

  if (!targetConfig) {
    return { success: false, error: `Target config '${selectedTargetName}' not found in aws-targets` };
  }

  if (project.agents.length === 0) {
    return { success: false, error: 'No agents defined in configuration' };
  }

  // Resolve agent
  const agentNames = project.agents.map(a => a.name);
  const agentSpec = options.agentName ? project.agents.find(a => a.name === options.agentName) : project.agents[0];

  if (options.agentName && !agentSpec) {
    return { success: false, error: `Agent '${options.agentName}' not found. Available: ${agentNames.join(', ')}` };
  }

  if (!agentSpec) {
    return { success: false, error: 'No agents defined in configuration' };
  }

  // Get the deployed state for this specific agent
  const agentState = targetState?.resources?.agents?.[agentSpec.name];

  if (!agentState) {
    return { success: false, error: `Agent '${agentSpec.name}' is not deployed to target '${selectedTargetName}'` };
  }

  if (!options.prompt) {
    return { success: false, error: 'No prompt provided. Usage: agentcore invoke "your prompt"' };
  }

  // Invoke the agent
  const response = await invokeAgentRuntime({
    region: targetConfig.region,
    runtimeArn: agentState.runtimeArn,
    payload: options.prompt,
  });

  return {
    success: true,
    agentName: agentSpec.name,
    targetName: selectedTargetName,
    response,
  };
}
