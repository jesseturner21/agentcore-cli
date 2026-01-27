import { SelectScreen } from '../../components';
import React from 'react';

interface RemoveGatewayScreenProps {
  /** List of gateway names that can be removed */
  gateways: string[];
  /** Called when a gateway is selected for removal */
  onSelect: (gatewayName: string) => void;
  /** Called when user cancels */
  onExit: () => void;
}

export function RemoveGatewayScreen({ gateways, onSelect, onExit }: RemoveGatewayScreenProps) {
  const items = gateways.map(name => ({
    id: name,
    title: name,
    description: `Remove gateway "${name}"`,
  }));

  return (
    <SelectScreen title="Select Gateway to Remove" items={items} onSelect={item => onSelect(item.id)} onExit={onExit} />
  );
}
