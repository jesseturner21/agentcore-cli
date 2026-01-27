import type { MemoryStrategyType } from '../../../../schema';
import { ProviderNameSchema } from '../../../../schema';
import {
  ConfirmReview,
  Panel,
  Screen,
  StepIndicator,
  TextInput,
  WizardMultiSelect,
  WizardSelect,
} from '../../components';
import type { SelectableItem } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation, useMultiSelectNavigation } from '../../hooks';
import { generateUniqueName } from '../../utils';
import type { AddMemoryConfig } from './types';
import { EVENT_EXPIRY_OPTIONS, MEMORY_STEP_LABELS, MEMORY_STRATEGY_OPTIONS } from './types';
import { useAddMemoryWizard } from './useAddMemoryWizard';
import { Text } from 'ink';
import React, { useMemo } from 'react';

interface AddMemoryScreenProps {
  onComplete: (config: AddMemoryConfig) => void;
  onExit: () => void;
  existingMemoryNames: string[];
  availableAgents: string[];
}

export function AddMemoryScreen({ onComplete, onExit, existingMemoryNames, availableAgents }: AddMemoryScreenProps) {
  const wizard = useAddMemoryWizard({ availableAgents });

  const strategyItems: SelectableItem[] = useMemo(
    () => MEMORY_STRATEGY_OPTIONS.map(opt => ({ id: opt.id, title: opt.title, description: opt.description })),
    []
  );

  const expiryItems: SelectableItem[] = useMemo(
    () => EVENT_EXPIRY_OPTIONS.map(opt => ({ id: String(opt.id), title: opt.title, description: opt.description })),
    []
  );

  const agentItems: SelectableItem[] = useMemo(
    () => availableAgents.map(name => ({ id: name, title: name })),
    [availableAgents]
  );

  const userAgentItems: SelectableItem[] = useMemo(
    () => availableAgents.filter(name => name !== wizard.config.ownerAgent).map(name => ({ id: name, title: name })),
    [availableAgents, wizard.config.ownerAgent]
  );

  const isNameStep = wizard.step === 'name';
  const isDescriptionStep = wizard.step === 'description';
  const isExpiryStep = wizard.step === 'expiry';
  const isStrategiesStep = wizard.step === 'strategies';
  const isOwnerStep = wizard.step === 'ownerAgent';
  const isUserAgentsStep = wizard.step === 'userAgents';
  const isConfirmStep = wizard.step === 'confirm';

  const expiryNav = useListNavigation({
    items: expiryItems,
    onSelect: item => wizard.setExpiry(Number(item.id)),
    onExit: () => wizard.goBack(),
    isActive: isExpiryStep,
  });

  const strategiesNav = useMultiSelectNavigation({
    items: strategyItems,
    getId: item => item.id,
    onConfirm: ids => wizard.setStrategyTypes(ids as MemoryStrategyType[]),
    onExit: () => wizard.goBack(),
    isActive: isStrategiesStep,
    requireSelection: true,
  });

  const ownerNav = useListNavigation({
    items: agentItems,
    onSelect: item => wizard.setOwnerAgent(item.id),
    onExit: () => wizard.goBack(),
    isActive: isOwnerStep,
  });

  const userAgentsNav = useMultiSelectNavigation({
    items: userAgentItems,
    getId: item => item.id,
    onConfirm: ids => wizard.setUserAgents(ids),
    onExit: () => wizard.goBack(),
    isActive: isUserAgentsStep,
    requireSelection: false,
  });

  useListNavigation({
    items: [{ id: 'confirm', title: 'Confirm' }],
    onSelect: () => onComplete(wizard.config),
    onExit: () => wizard.goBack(),
    isActive: isConfirmStep,
  });

  const helpText =
    isStrategiesStep || isUserAgentsStep
      ? 'Space toggle · Enter confirm · Esc back'
      : isExpiryStep || isOwnerStep
        ? HELP_TEXT.NAVIGATE_SELECT
        : isConfirmStep
          ? HELP_TEXT.CONFIRM_CANCEL
          : HELP_TEXT.TEXT_INPUT;

  const headerContent = <StepIndicator steps={wizard.steps} currentStep={wizard.step} labels={MEMORY_STEP_LABELS} />;

  return (
    <Screen title="Add Memory" onExit={onExit} helpText={helpText} headerContent={headerContent}>
      <Panel>
        {isNameStep && (
          <TextInput
            key="name"
            prompt="Memory provider name"
            initialValue={generateUniqueName('MyMemory', existingMemoryNames)}
            onSubmit={wizard.setName}
            onCancel={onExit}
            schema={ProviderNameSchema}
            customValidation={value => !existingMemoryNames.includes(value) || 'Memory name already exists'}
          />
        )}

        {isDescriptionStep && (
          <TextInput
            key="description"
            prompt="Description"
            initialValue={`Memory for ${wizard.config.name}`}
            onSubmit={wizard.setDescription}
            onCancel={() => wizard.goBack()}
          />
        )}

        {isExpiryStep && (
          <WizardSelect
            title="Event expiry duration"
            description="How long to retain memory events"
            items={expiryItems}
            selectedIndex={expiryNav.selectedIndex}
          />
        )}

        {isStrategiesStep && (
          <WizardMultiSelect
            title="Select memory strategies"
            description="Choose one or more strategies for this memory"
            items={strategyItems}
            cursorIndex={strategiesNav.cursorIndex}
            selectedIds={strategiesNav.selectedIds}
          />
        )}

        {isOwnerStep && (
          <WizardSelect
            title="Select the Agent that will own and manage this Memory"
            description="This agent creates and manages the memory resource"
            items={agentItems}
            selectedIndex={ownerNav.selectedIndex}
            emptyMessage="No agents defined. Add an agent first."
          />
        )}

        {isUserAgentsStep &&
          (userAgentItems.length > 0 ? (
            <WizardMultiSelect
              title="Select other agents to grant access (Use/Read-only)"
              description="These agents can use the memory but don't manage it"
              items={userAgentItems}
              cursorIndex={userAgentsNav.cursorIndex}
              selectedIds={userAgentsNav.selectedIds}
            />
          ) : (
            <Text dimColor>No other agents to grant access to. Press Enter to continue.</Text>
          ))}

        {isConfirmStep && (
          <ConfirmReview
            fields={[
              { label: 'Name', value: wizard.config.name },
              { label: 'Description', value: wizard.config.description },
              { label: 'Event Expiry', value: `${wizard.config.eventExpiryDuration} days` },
              { label: 'Strategies', value: wizard.config.strategies.map(s => s.type).join(', ') },
              { label: 'Owner Agent', value: wizard.config.ownerAgent },
              {
                label: 'User Agents',
                value: wizard.config.userAgents.length > 0 ? wizard.config.userAgents.join(', ') : 'None',
              },
            ]}
          />
        )}
      </Panel>
    </Screen>
  );
}
