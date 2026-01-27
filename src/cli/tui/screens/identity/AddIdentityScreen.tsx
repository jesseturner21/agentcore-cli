import type { IdentityCredentialVariant } from '../../../../schema';
import { WorkloadIdentityNameSchema } from '../../../../schema';
import {
  ConfirmReview,
  Panel,
  Screen,
  SecretInput,
  StepIndicator,
  TextInput,
  WizardMultiSelect,
  WizardSelect,
} from '../../components';
import type { SelectableItem } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation, useMultiSelectNavigation } from '../../hooks';
import { generateUniqueName } from '../../utils';
import type { AddIdentityConfig } from './types';
import { IDENTITY_STEP_LABELS, IDENTITY_TYPE_OPTIONS } from './types';
import { useAddIdentityWizard } from './useAddIdentityWizard';
import { Text } from 'ink';
import React, { useMemo } from 'react';

interface AddIdentityScreenProps {
  onComplete: (config: AddIdentityConfig) => void;
  onExit: () => void;
  existingIdentityNames: string[];
  availableAgents: string[];
}

export function AddIdentityScreen({
  onComplete,
  onExit,
  existingIdentityNames,
  availableAgents,
}: AddIdentityScreenProps) {
  const wizard = useAddIdentityWizard({ availableAgents });

  const typeItems: SelectableItem[] = useMemo(
    () => IDENTITY_TYPE_OPTIONS.map(opt => ({ id: opt.id, title: opt.title, description: opt.description })),
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

  const isTypeStep = wizard.step === 'type';
  const isNameStep = wizard.step === 'name';
  const isApiKeyStep = wizard.step === 'apiKey';
  const isOwnerStep = wizard.step === 'ownerAgent';
  const isUserAgentsStep = wizard.step === 'userAgents';
  const isConfirmStep = wizard.step === 'confirm';

  const typeNav = useListNavigation({
    items: typeItems,
    onSelect: item => wizard.setIdentityType(item.id as IdentityCredentialVariant),
    onExit: () => onExit(),
    isActive: isTypeStep,
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

  const helpText = isUserAgentsStep
    ? 'Space toggle · Enter confirm · Esc back'
    : isTypeStep || isOwnerStep
      ? HELP_TEXT.NAVIGATE_SELECT
      : isConfirmStep
        ? HELP_TEXT.CONFIRM_CANCEL
        : HELP_TEXT.TEXT_INPUT;

  const headerContent = <StepIndicator steps={wizard.steps} currentStep={wizard.step} labels={IDENTITY_STEP_LABELS} />;

  return (
    <Screen title="Add Identity" onExit={onExit} helpText={helpText} headerContent={headerContent}>
      <Panel>
        {isTypeStep && (
          <WizardSelect
            title="Select identity type"
            description="Choose the type of credential provider"
            items={typeItems}
            selectedIndex={typeNav.selectedIndex}
          />
        )}

        {isNameStep && (
          <TextInput
            key="name"
            prompt="Identity provider name"
            initialValue={generateUniqueName('MyApiKey', existingIdentityNames)}
            onSubmit={wizard.setName}
            onCancel={() => wizard.goBack()}
            schema={WorkloadIdentityNameSchema}
            customValidation={value => !existingIdentityNames.includes(value) || 'Identity name already exists'}
          />
        )}

        {isApiKeyStep && (
          <SecretInput
            key="apiKey"
            prompt="API Key"
            onSubmit={wizard.setApiKey}
            onCancel={() => wizard.goBack()}
            customValidation={value => value.trim().length > 0 || 'API key is required'}
            revealChars={4}
          />
        )}

        {isOwnerStep && (
          <WizardSelect
            title="Select the Agent that will own and manage this Identity"
            description="This agent creates and manages the credential provider"
            items={agentItems}
            selectedIndex={ownerNav.selectedIndex}
            emptyMessage="No agents defined. Add an agent first."
          />
        )}

        {isUserAgentsStep &&
          (userAgentItems.length > 0 ? (
            <WizardMultiSelect
              title="Select other agents to grant access (Use/Read-only)"
              description="These agents can use the credentials but don't manage them"
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
              { label: 'Type', value: 'API Key' },
              { label: 'Name', value: wizard.config.name },
              { label: 'API Key', value: '*'.repeat(Math.min(wizard.config.apiKey.length, 20)) },
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
