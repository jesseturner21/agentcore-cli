import type { AgentCoreProjectSpec, AwsDeploymentTargets, DeployedState } from '../../../../schema';
import type { StatusContext, StatusResult } from '../../../commands/status/action';
import { handleStatus, loadStatusConfig } from '../../../commands/status/action';
import { getErrorMessage } from '../../../errors';
import { useCallback, useEffect, useMemo, useState } from 'react';

type StatusPhase = 'loading' | 'ready' | 'checking' | 'error';

interface AgentEntry {
  name: string;
  isDeployed: boolean;
  runtimeId?: string;
}

interface StatusState {
  phase: StatusPhase;
  error?: string;
  project?: AgentCoreProjectSpec;
  deployedState?: DeployedState;
  awsTargets?: AwsDeploymentTargets;
  targetIndex: number;
  statusDetails?: StatusResult;
  statusError?: string;
}

export function useStatusFlow() {
  const [state, setState] = useState<StatusState>({
    phase: 'loading',
    targetIndex: 0,
  });

  useEffect(() => {
    let active = true;
    loadStatusConfig()
      .then(context => {
        if (!active) return;

        // Validate before setting ready
        if (!context.project.agents.length) {
          setState(prev => ({ ...prev, phase: 'error', error: 'No agents defined in configuration.' }));
          return;
        }

        const deployedTargets = Object.keys(context.deployedState.targets);
        if (deployedTargets.length === 0) {
          setState(prev => ({
            ...prev,
            phase: 'error',
            error: 'No deployed targets found. Run `agentcore deploy` first.',
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          phase: 'ready',
          project: context.project,
          deployedState: context.deployedState,
          awsTargets: context.awsTargets,
        }));
      })
      .catch((error: Error) => {
        if (!active) return;
        setState(prev => ({ ...prev, phase: 'error', error: error.message }));
      });

    return () => {
      active = false;
    };
  }, []);

  const context = useMemo<StatusContext | null>(() => {
    if (!state.project || !state.deployedState || !state.awsTargets) return null;
    return {
      project: state.project,
      deployedState: state.deployedState,
      awsTargets: state.awsTargets,
    };
  }, [state.awsTargets, state.deployedState, state.project]);

  const targetNames = useMemo(() => {
    if (!state.deployedState) return [];
    return Object.keys(state.deployedState.targets);
  }, [state.deployedState]);

  const targetName = targetNames[state.targetIndex];

  const targetConfig = useMemo(() => {
    if (!state.awsTargets || !targetName) return undefined;
    return state.awsTargets.find(target => target.name === targetName);
  }, [state.awsTargets, targetName]);

  const agents = useMemo<AgentEntry[]>(() => {
    if (!state.project) return [];
    const deployedAgents = state.deployedState?.targets?.[targetName ?? '']?.resources?.agents;
    return state.project.agents.map(agent => {
      const agentState = deployedAgents?.[agent.name];
      return {
        name: agent.name,
        isDeployed: !!agentState,
        runtimeId: agentState?.runtimeId,
      };
    });
  }, [state.deployedState, state.project, targetName]);

  const cycleTarget = useCallback(() => {
    if (!targetNames.length) return;
    setState(prev => ({
      ...prev,
      targetIndex: (prev.targetIndex + 1) % targetNames.length,
      statusDetails: undefined,
      statusError: undefined,
    }));
  }, [targetNames.length]);

  const resetStatus = useCallback(() => {
    setState(prev => ({ ...prev, statusDetails: undefined, statusError: undefined }));
  }, []);

  const checkStatus = useCallback(
    async (agentName: string) => {
      if (!context) {
        setState(prev => ({ ...prev, phase: 'error', error: 'Status context not loaded.' }));
        return;
      }

      if (targetNames.length === 0) {
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: 'No deployed targets found. Run `agentcore deploy` first.',
        }));
        return;
      }

      const agent = state.project?.agents.find(item => item.name === agentName);
      if (!agent) {
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: 'No agents defined in configuration.',
        }));
        return;
      }

      setState(prev => ({ ...prev, phase: 'checking', statusError: undefined }));

      try {
        const result = await handleStatus(context, {
          agentName: agent.name,
          targetName,
        });

        if (!result.success) {
          setState(prev => ({
            ...prev,
            phase: 'ready',
            statusDetails: undefined,
            statusError: result.error ?? 'Failed to fetch status.',
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          phase: 'ready',
          statusDetails: result,
          statusError: undefined,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          phase: 'ready',
          statusDetails: undefined,
          statusError: getErrorMessage(error),
        }));
      }
    },
    [context, state.project, targetName, targetNames.length]
  );

  return {
    phase: state.phase,
    error: state.error,
    projectName: state.project?.name ?? 'Unknown',
    targetName: targetName ?? 'Unknown',
    targetRegion: targetConfig?.region,
    agents,
    hasMultipleTargets: targetNames.length > 1,
    statusDetails: state.statusDetails,
    statusError: state.statusError,
    cycleTarget,
    resetStatus,
    checkStatus,
  };
}
