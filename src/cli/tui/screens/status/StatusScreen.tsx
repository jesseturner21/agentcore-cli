import { Panel, Screen, SelectList, TwoColumn } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation } from '../../hooks';
import { useStatusFlow } from './useStatusFlow';
import { Box, Text, useInput } from 'ink';
import React from 'react';

interface StatusScreenProps {
  /** Whether running in interactive TUI mode (from App.tsx) vs CLI mode */
  isInteractive: boolean;
  onExit: () => void;
}

export function StatusScreen({ isInteractive: _isInteractive, onExit }: StatusScreenProps) {
  const {
    phase,
    error,
    projectName,
    targetName,
    targetRegion,
    agents,
    hasMultipleTargets,
    statusDetails,
    statusError,
    cycleTarget,
    resetStatus,
    checkStatus,
  } = useStatusFlow();

  const agentItems = agents.map(agent => {
    const deployment = agent.isDeployed ? 'Deployed' : 'Not deployed';
    const runtimeInfo = agent.runtimeId ? `runtime: ${agent.runtimeId}` : undefined;
    const description = [deployment, runtimeInfo].filter(Boolean).join(' • ');
    return {
      id: agent.name,
      title: agent.name,
      description,
    };
  });

  const { selectedIndex } = useListNavigation({
    items: agentItems,
    onSelect: item => {
      void checkStatus(item.title);
    },
    isActive: phase === 'ready',
  });

  useInput(
    input => {
      if (phase !== 'ready') return;
      if (input === 't' && hasMultipleTargets) {
        cycleTarget();
      }
    },
    { isActive: phase === 'ready' }
  );

  React.useEffect(() => {
    resetStatus();
  }, [selectedIndex, resetStatus]);

  if (phase === 'loading') {
    return (
      <Screen title="AgentCore Status" onExit={onExit}>
        <Text dimColor>Loading project status...</Text>
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen title="AgentCore Status" onExit={onExit}>
        <Text color="red">{error}</Text>
      </Screen>
    );
  }

  const helpText = hasMultipleTargets ? HELP_TEXT.STATUS_TARGET_CYCLE : HELP_TEXT.STATUS_REFRESH;

  const headerContent = (
    <Box flexDirection="column">
      <Box>
        <Text>Project: </Text>
        <Text color="green">{projectName}</Text>
      </Box>
      <Box>
        <Text>Target: </Text>
        <Text color="yellow">
          {targetName}
          {targetRegion ? ` (${targetRegion})` : ''}
        </Text>
      </Box>
    </Box>
  );

  const selectedAgent = agents[selectedIndex];
  const statusMatchesSelection = statusDetails?.agentName === selectedAgent?.name;
  const runtimeStatus = statusMatchesSelection ? statusDetails?.runtimeStatus : undefined;
  const runtimeError = statusMatchesSelection ? statusError : undefined;

  return (
    <Screen title="AgentCore Status" onExit={onExit} helpText={helpText} headerContent={headerContent}>
      <TwoColumn
        marginTop={1}
        ratio={[2, 3]}
        left={
          <Panel title="Agents" fullWidth>
            <SelectList items={agentItems} selectedIndex={selectedIndex} />
          </Panel>
        }
        right={
          <Panel title="Status" fullWidth>
            <Box flexDirection="column" paddingX={1}>
              <Box>
                <Text>Agent: </Text>
                <Text color="cyan">{selectedAgent?.name ?? 'Unknown'}</Text>
              </Box>
              <Box>
                <Text>Deployment: </Text>
                <Text color={selectedAgent?.isDeployed ? 'green' : 'red'}>
                  {selectedAgent?.isDeployed ? 'Deployed' : 'Not deployed'}
                </Text>
              </Box>
              {selectedAgent?.runtimeId && (
                <Box>
                  <Text>Runtime ID: </Text>
                  <Text>{selectedAgent.runtimeId}</Text>
                </Box>
              )}
              {phase === 'checking' && <Text dimColor>Checking runtime status...</Text>}
              {runtimeError && <Text color="red">{runtimeError}</Text>}
              {runtimeStatus && (
                <Box>
                  <Text>Runtime Status: </Text>
                  <Text color="yellow">{runtimeStatus}</Text>
                </Box>
              )}
              {!runtimeStatus && !runtimeError && selectedAgent?.isDeployed && (
                <Text dimColor>Enter to refresh runtime status</Text>
              )}
              {!selectedAgent?.isDeployed && <Text dimColor>Deploy this agent to track runtime status.</Text>}
            </Box>
          </Panel>
        }
      />
    </Screen>
  );
}
