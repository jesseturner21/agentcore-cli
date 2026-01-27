import type { SelectableItem } from './SelectList';
import { Box, Text } from 'ink';

export interface MultiSelectListProps<T extends SelectableItem> {
  items: T[];
  selectedIndex: number;
  selectedIds: Set<string>;
  emptyMessage?: string;
}

export function MultiSelectList<T extends SelectableItem>(props: MultiSelectListProps<T>) {
  if (props.items.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>No agents found</Text>
        <Text dimColor>{props.emptyMessage ?? 'No agents available in agentcore.json'}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {props.items.map((item, idx) => {
        const isCursor = idx === props.selectedIndex;
        const isChecked = props.selectedIds.has(item.id);
        const checkbox = isChecked ? '[✓]' : '[ ]';
        return (
          <Box key={item.id}>
            <Text wrap="truncate">
              <Text color={isCursor ? 'cyan' : undefined}>{isCursor ? '❯' : ' '} </Text>
              <Text color={isChecked ? 'green' : undefined}>{checkbox} </Text>
              <Text color={isCursor ? 'cyan' : undefined}>{item.title}</Text>
              {item.description && <Text dimColor> - {item.description}</Text>}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
