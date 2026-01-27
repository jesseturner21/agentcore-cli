import { type NextStep, NextSteps, Panel, Screen } from '../../components';
import { Box, Text } from 'ink';
import React from 'react';

const ADD_SUCCESS_STEPS: NextStep[] = [
  { command: 'add', label: 'Add another resource' },
  { command: 'attach', label: 'Attach resources' },
];

interface AddSuccessScreenProps {
  /** Whether running in interactive TUI mode */
  isInteractive: boolean;
  /** Success message (shown in green) */
  message: string;
  /** Optional detail text */
  detail?: string;
  /** Called when "Add another resource" is selected */
  onAddAnother: () => void;
  /** Called when "Attach resources" is selected */
  onAttach?: () => void;
  /** Called when "return" is selected to go back to main menu, or in non-interactive exit */
  onExit: () => void;
}

export function AddSuccessScreen({
  isInteractive,
  message,
  detail,
  onAddAnother,
  onAttach,
  onExit,
}: AddSuccessScreenProps) {
  const handleSelect = (step: NextStep) => {
    if (step.command === 'add') {
      onAddAnother();
    } else if (step.command === 'attach') {
      onAttach?.();
    }
  };

  // Non-interactive mode is handled by parent's useEffect that exits on success states
  // This component just renders the success message
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
        <NextSteps steps={ADD_SUCCESS_STEPS} isInteractive={true} onSelect={handleSelect} onBack={onExit} />
      </Box>
    </Screen>
  );
}
