import { type NextStep, NextSteps, Panel, Screen } from '../../components';
import { Box, Text } from 'ink';
import React from 'react';

const REMOVE_SUCCESS_STEPS: NextStep[] = [
  { command: 'remove', label: 'Remove another resource' },
  { command: 'attach', label: 'Attach resources' },
];

interface RemoveSuccessScreenProps {
  /** Whether running in interactive TUI mode */
  isInteractive: boolean;
  /** Success message (shown in green) */
  message: string;
  /** Optional detail text */
  detail?: string;
  /** Called when "Remove another resource" is selected */
  onRemoveAnother: () => void;
  /** Called when "Attach resources" is selected */
  onAttach?: () => void;
  /** Called when "return" is selected to go back to main menu, or in non-interactive exit */
  onExit: () => void;
}

export function RemoveSuccessScreen({
  isInteractive,
  message,
  detail,
  onRemoveAnother,
  onAttach,
  onExit,
}: RemoveSuccessScreenProps) {
  const handleSelect = (step: NextStep) => {
    if (step.command === 'remove') {
      onRemoveAnother();
    } else if (step.command === 'attach') {
      onAttach?.();
    }
  };

  // Non-interactive mode - just show the success message
  if (!isInteractive) {
    return (
      <Screen title="Success" onExit={onExit}>
        <Panel borderColor="green">
          <Box flexDirection="column" gap={1}>
            <Text color="green">{message}</Text>
            {detail && <Text>{detail}</Text>}
          </Box>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen title="Success" onExit={onExit}>
      <Box flexDirection="column" gap={1}>
        <Panel borderColor="green">
          <Box flexDirection="column" gap={1}>
            <Text color="green">{message}</Text>
            {detail && <Text>{detail}</Text>}
          </Box>
        </Panel>
        <NextSteps steps={REMOVE_SUCCESS_STEPS} isInteractive={true} onSelect={handleSelect} onBack={onExit} />
      </Box>
    </Screen>
  );
}
