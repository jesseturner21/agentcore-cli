import type { RemovableIdentity } from '../../../operations/remove';
import { SelectScreen } from '../../components';
import React from 'react';

interface RemoveIdentityScreenProps {
  /** List of identities that can be removed */
  identities: RemovableIdentity[];
  /** Called when an identity is selected for removal */
  onSelect: (identityName: string) => void;
  /** Called when user cancels */
  onExit: () => void;
}

export function RemoveIdentityScreen({ identities, onSelect, onExit }: RemoveIdentityScreenProps) {
  const items = identities.map(identity => {
    const userInfo = identity.userAgents.length > 0 ? ` • ${identity.userAgents.length} users` : '';
    const policyInfo = identity.removalPolicy === 'restrict' ? ' [restrict]' : '';
    return {
      id: identity.name,
      title: `${identity.name}${policyInfo}`,
      description: `${identity.variant} • owner: ${identity.ownerAgent}${userInfo}`,
    };
  });

  return (
    <SelectScreen
      title="Select Identity to Remove"
      items={items}
      onSelect={item => onSelect(item.id)}
      onExit={onExit}
    />
  );
}
