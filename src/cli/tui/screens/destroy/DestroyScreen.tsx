import type { DeployedTarget } from '../../../operations/destroy';
import { ConfirmPrompt, Screen, SelectScreen, StepProgress } from '../../components';
import { useDestroyFlow } from './useDestroyFlow';
import { Box, Text, useInput } from 'ink';
import React from 'react';

interface TargetItem {
  id: string;
  title: string;
  description: string;
  deployedTarget: DeployedTarget;
}

interface DestroyScreenProps {
  /** Whether running in interactive TUI mode (from App.tsx) vs CLI mode */
  isInteractive: boolean;
  onExit: () => void;
}

export function DestroyScreen({ isInteractive, onExit }: DestroyScreenProps) {
  const flow = useDestroyFlow();

  // In non-interactive mode, exit after completion
  React.useEffect(() => {
    if (!isInteractive && flow.phase === 'complete') {
      onExit();
    }
  }, [isInteractive, flow.phase, onExit]);

  useInput(
    (input, key) => {
      if (key.return || input === ' ') {
        if (flow.hasError) {
          onExit();
        } else {
          // Reset to check for more targets
          flow.reset();
        }
      }
    },
    { isActive: flow.phase === 'complete' && isInteractive }
  );

  if (flow.phase === 'checking') {
    return (
      <Screen title="Destroy" onExit={onExit}>
        <Text dimColor>Checking for deployed resources...</Text>
      </Screen>
    );
  }

  if (flow.phase === 'not-found') {
    return (
      <Screen title="Destroy" onExit={onExit}>
        <Box flexDirection="column" gap={1}>
          <Text color="green">No deployed stacks found.</Text>
          <Text dimColor>All AWS resources have been cleaned up.</Text>
        </Box>
      </Screen>
    );
  }

  if (flow.phase === 'select') {
    const items: TargetItem[] = flow.deployedTargets.map(dt => ({
      id: dt.target.name,
      title: dt.target.name,
      description: `${dt.target.region} · ${dt.stack.stackName}`,
      deployedTarget: dt,
    }));

    return (
      <SelectScreen
        title="Destroy Target"
        items={items}
        onSelect={(item: TargetItem) => flow.selectTarget(item.deployedTarget)}
        onExit={onExit}
      />
    );
  }

  if (flow.phase === 'confirm' && flow.selectedTarget) {
    return (
      <ConfirmPrompt
        message={`Destroy ${flow.selectedTarget.target.name}?`}
        detail={`This will delete the CloudFormation stack "${flow.selectedTarget.stack.stackName}" and all its resources in ${flow.selectedTarget.target.region}.`}
        onConfirm={flow.confirmDestroy}
        onCancel={flow.cancelDestroy}
        showInput
        inputPrompt="Confirm destroy (y/n)"
      />
    );
  }

  if (flow.phase === 'destroying') {
    return (
      <Screen title="Destroy" onExit={onExit}>
        <Box flexDirection="column" gap={1}>
          <Text>Destroying AWS resources...</Text>
          <StepProgress steps={flow.steps} />
        </Box>
      </Screen>
    );
  }

  if (flow.phase === 'complete') {
    return (
      <Screen title="Destroy" onExit={onExit}>
        <Box flexDirection="column" gap={1}>
          <StepProgress steps={flow.steps} />
          {flow.hasError ? (
            <Text color="red">{isInteractive ? 'Destroy failed. Press Enter to exit.' : 'Destroy failed.'}</Text>
          ) : (
            <>
              <Text color="green">Stack destroyed successfully.</Text>
              {isInteractive && <Text dimColor>Press Enter to check for more targets.</Text>}
            </>
          )}
        </Box>
      </Screen>
    );
  }

  return null;
}
