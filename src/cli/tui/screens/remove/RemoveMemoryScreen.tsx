import type { RemovableMemory } from '../../../operations/remove';
import { SelectScreen } from '../../components';
import React from 'react';

interface RemoveMemoryScreenProps {
  /** List of memories that can be removed */
  memories: RemovableMemory[];
  /** Called when a memory is selected for removal */
  onSelect: (memoryName: string) => void;
  /** Called when user cancels */
  onExit: () => void;
}

export function RemoveMemoryScreen({ memories, onSelect, onExit }: RemoveMemoryScreenProps) {
  const items = memories.map(memory => {
    const userInfo = memory.userAgents.length > 0 ? ` • ${memory.userAgents.length} users` : '';
    const policyInfo = memory.removalPolicy === 'restrict' ? ' [restrict]' : '';
    return {
      id: memory.name,
      title: `${memory.name}${policyInfo}`,
      description: `owner: ${memory.ownerAgent}${userInfo}`,
    };
  });

  return (
    <SelectScreen title="Select Memory to Remove" items={items} onSelect={item => onSelect(item.id)} onExit={onExit} />
  );
}
