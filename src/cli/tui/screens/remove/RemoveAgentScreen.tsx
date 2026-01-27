import { SelectScreen } from '../../components';
import React from 'react';

interface RemoveAgentScreenProps {
  /** List of agent names that can be removed */
  agents: string[];
  /** Called when an agent is selected for removal */
  onSelect: (agentName: string) => void;
  /** Called when user cancels */
  onExit: () => void;
}

export function RemoveAgentScreen({ agents, onSelect, onExit }: RemoveAgentScreenProps) {
  const items = agents.map(name => ({
    id: name,
    title: name,
    description: `Remove agent "${name}"`,
  }));

  return (
    <SelectScreen title="Select Agent to Remove" items={items} onSelect={item => onSelect(item.id)} onExit={onExit} />
  );
}
