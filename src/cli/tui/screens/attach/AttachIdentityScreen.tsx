import type { AttachIdentityConfig } from '../../../operations/attach';
import { ConfirmReview, Panel, Screen, WizardSelect } from '../../components';
import type { SelectableItem } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation } from '../../hooks';
import React, { useCallback, useMemo, useState } from 'react';

type Step = 'identity' | 'confirm';

interface AttachIdentityScreenProps {
  sourceAgent: string;
  availableIdentities: string[];
  onComplete: (config: AttachIdentityConfig) => void;
  onExit: () => void;
}

export function AttachIdentityScreen({
  sourceAgent,
  availableIdentities,
  onComplete,
  onExit,
}: AttachIdentityScreenProps) {
  const [step, setStep] = useState<Step>('identity');
  const [config, setConfig] = useState<AttachIdentityConfig | null>(null);

  const identityItems: SelectableItem[] = useMemo(
    () => availableIdentities.map(name => ({ id: name, title: name })),
    [availableIdentities]
  );

  const goBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('identity');
    } else {
      onExit();
    }
  }, [step, onExit]);

  const identityNav = useListNavigation({
    items: identityItems,
    onSelect: item => {
      const sanitized = item.id.replace(/-/g, '_').toUpperCase();
      // Auto-generate sensible defaults
      setConfig({
        identityName: item.id,
        envVarName: `AGENTCORE_IDENTITY_${sanitized}_ID`,
      });
      setStep('confirm');
    },
    onExit: goBack,
    isActive: step === 'identity',
  });

  useListNavigation({
    items: [{ id: 'confirm', title: 'Confirm' }],
    onSelect: () => {
      if (config) {
        onComplete(config);
      }
    },
    onExit: goBack,
    isActive: step === 'confirm',
  });

  const helpText = step === 'identity' ? HELP_TEXT.NAVIGATE_SELECT : HELP_TEXT.CONFIRM_CANCEL;

  return (
    <Screen title={`Attach Identity to ${sourceAgent}`} onExit={onExit} helpText={helpText}>
      <Panel>
        {step === 'identity' && (
          <WizardSelect
            title="Select identity to attach"
            items={identityItems}
            selectedIndex={identityNav.selectedIndex}
            emptyMessage="No identities available to attach"
          />
        )}

        {step === 'confirm' && config && (
          <ConfirmReview
            fields={[
              { label: 'Identity', value: config.identityName },
              { label: 'Env Var', value: config.envVarName },
            ]}
          />
        )}
      </Panel>
    </Screen>
  );
}
