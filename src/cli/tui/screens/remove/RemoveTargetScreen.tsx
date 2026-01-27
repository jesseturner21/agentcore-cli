import type { AwsDeploymentTarget } from '../../../../schema';
import { SelectScreen } from '../../components';
import React from 'react';

interface RemoveTargetScreenProps {
  /** List of deployment targets that can be removed */
  targets: AwsDeploymentTarget[];
  /** Called when a target is selected for removal */
  onSelect: (targetName: string) => void;
  /** Called when user cancels */
  onExit: () => void;
}

export function RemoveTargetScreen({ targets, onSelect, onExit }: RemoveTargetScreenProps) {
  const items = targets.map(target => ({
    id: target.name,
    title: target.name,
    description: `${target.account} · ${target.region}`,
  }));

  return (
    <SelectScreen title="Select Target to Remove" items={items} onSelect={item => onSelect(item.id)} onExit={onExit} />
  );
}
