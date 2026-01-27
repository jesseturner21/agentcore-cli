import { useListNavigation } from '../hooks';
import { STATUS_COLORS } from '../theme';
import { SelectList } from './SelectList';
import { Box, Text } from 'ink';

/**
 * Defines a next step action after a command completes.
 */
export interface NextStep {
  /** The command to run (e.g., 'invoke', 'deploy') */
  command: string;
  /** Human-readable label (e.g., 'Test your agent') */
  label: string;
}

export interface NextStepsProps {
  /** List of next step options */
  steps: NextStep[];
  /** Whether running in interactive TUI mode */
  isInteractive: boolean;
  /** Callback when a step is selected (interactive mode) */
  onSelect?: (step: NextStep) => void;
  /** Callback when user wants to go back to home (interactive mode) */
  onBack?: () => void;
  /** Whether the component is active for keyboard input */
  isActive?: boolean;
}

/**
 * Renders next steps after a command completes.
 *
 * Interactive mode: Shows a selectable list with "return" option to go back to main menu
 * Non-interactive mode: Shows a text hint and exits
 */
export function NextSteps({ steps, isInteractive, onSelect, onBack, isActive = true }: NextStepsProps) {
  // Build items for interactive mode (add "return to main menu" as last option)
  const interactiveItems = [
    ...steps.map(step => ({
      id: step.command,
      title: step.command,
      description: step.label,
    })),
    { id: '_back', title: 'return', description: 'Return to main menu' },
  ];

  const { selectedIndex } = useListNavigation({
    items: interactiveItems,
    onSelect: item => {
      if (item.id === '_back') {
        onBack?.();
      } else {
        const step = steps.find(s => s.command === item.id);
        if (step) {
          onSelect?.(step);
        }
      }
    },
    onExit: onBack,
    isActive: isInteractive && isActive,
  });

  if (isInteractive) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text>Next steps:</Text>
        <Box marginTop={1}>
          <SelectList items={interactiveItems} selectedIndex={selectedIndex} />
        </Box>
      </Box>
    );
  }

  // Non-interactive mode: render as text hint
  if (steps.length === 0) {
    return null;
  }

  if (steps.length === 1) {
    const step = steps[0]!;
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>
          Next: Run <Text color={STATUS_COLORS.info}>agentcore {step.command}</Text> to {step.label.toLowerCase()}
        </Text>
      </Box>
    );
  }

  // Multiple steps: format as "Run X to do Y, or Z to do W"
  const parts = steps.map((step, i) => {
    const isLast = i === steps.length - 1;
    const separator = isLast ? ', or ' : i > 0 ? ', ' : '';
    return (
      <Text key={step.command}>
        {separator}
        <Text color={STATUS_COLORS.info}>agentcore {step.command}</Text>
        <Text> to {step.label.toLowerCase()}</Text>
      </Text>
    );
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>Next: Run {parts}</Text>
    </Box>
  );
}
