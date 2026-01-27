import { ConfirmPrompt, Screen, StepProgress } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useRemoveFlow } from './useRemoveFlow';
import { Box, Text, useInput } from 'ink';
import { useEffect } from 'react';

interface RemoveAllScreenProps {
  /** Whether running in interactive TUI mode (from App.tsx) vs CLI mode */
  isInteractive?: boolean;
  force?: boolean;
  dryRun?: boolean;
  onExit: () => void;
  onRequestDestroy?: () => void;
}

export function RemoveAllScreen({
  isInteractive = true,
  force = false,
  dryRun = false,
  onExit,
  onRequestDestroy,
}: RemoveAllScreenProps) {
  const flow = useRemoveFlow({ force, dryRun });

  // Auto-exit in non-interactive mode when complete
  useEffect(() => {
    if (!isInteractive && (flow.phase === 'complete' || flow.phase === 'not-found' || flow.phase === 'dry-run')) {
      onExit();
    }
  }, [isInteractive, flow.phase, onExit]);

  // Handle key press for complete phase
  useInput(
    (input, key) => {
      if (key.return || input === ' ') {
        onExit();
      }
      // 'd' to go to destroy if there are deployed resources
      if (input === 'd' && flow.hasDeployedResources && onRequestDestroy) {
        onRequestDestroy();
      }
    },
    { isActive: flow.phase === 'complete' }
  );

  // Show confirmation prompt for non-force mode
  if (flow.phase === 'confirm' && !force) {
    const detail =
      flow.itemsToRemove.length > 0
        ? `This will reset:\n${flow.itemsToRemove.map(item => `• ${item}`).join('\n')}\n\nAll agent definitions and configurations will be cleared.`
        : undefined;

    return (
      <ConfirmPrompt
        message="Reset all AgentCore schemas to empty state?"
        detail={detail}
        onConfirm={flow.confirmRemoval}
        onCancel={onExit}
        showInput={true}
        inputPrompt="Confirm reset (y/n)"
      />
    );
  }

  return (
    <Screen
      title="Reset AgentCore Schemas"
      onExit={onExit}
      helpText={flow.phase === 'complete' ? HELP_TEXT.EXIT : HELP_TEXT.EXIT}
    >
      <Box flexDirection="column" gap={1}>
        {flow.phase === 'checking' && <Text dimColor>Checking for AgentCore project...</Text>}

        {flow.phase === 'not-found' && (
          <Box flexDirection="column" gap={1}>
            <Text color="yellow">No AgentCore project found in current directory.</Text>
            <Text dimColor>Nothing to reset.</Text>
          </Box>
        )}

        {flow.phase === 'dry-run' && (
          <Box flexDirection="column" gap={1}>
            <Text color="cyan">Dry run - showing what would be reset:</Text>
            <Box marginLeft={2} flexDirection="column">
              {flow.itemsToRemove.map((item, index) => (
                <Text key={index} dimColor>
                  • {item}
                </Text>
              ))}
            </Box>
          </Box>
        )}

        {flow.phase === 'removing' && (
          <Box flexDirection="column" gap={1}>
            <Text>Resetting AgentCore schemas...</Text>
            <StepProgress steps={flow.steps} />
          </Box>
        )}

        {flow.phase === 'complete' && (
          <Box flexDirection="column" gap={1}>
            {flow.hasError ? (
              <>
                <Text color="red">Reset completed with errors</Text>
                <Text dimColor>Some schemas may need manual cleanup</Text>
              </>
            ) : (
              <>
                <Text color="green">AgentCore schemas reset successfully</Text>
                {flow.hasDeployedResources && onRequestDestroy ? (
                  <>
                    <Text color="yellow">Note: AWS resources are still deployed.</Text>
                    <Text dimColor>Press d to destroy AWS resources, or Enter to exit</Text>
                  </>
                ) : (
                  <Text dimColor>All schemas have been reset to empty state</Text>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    </Screen>
  );
}
