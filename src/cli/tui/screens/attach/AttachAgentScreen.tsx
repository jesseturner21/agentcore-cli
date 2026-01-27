import type { AttachAgentConfig } from '../../../operations/attach';
import { ConfirmReview, Panel, Screen, WizardSelect } from '../../components';
import type { SelectableItem } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation } from '../../hooks';
import React, { useCallback, useMemo, useState } from 'react';

type Step = 'target' | 'confirm';

interface AttachAgentScreenProps {
  sourceAgent: string;
  availableAgents: string[];
  onComplete: (config: AttachAgentConfig) => void;
  onExit: () => void;
}

export function AttachAgentScreen({ sourceAgent, availableAgents, onComplete, onExit }: AttachAgentScreenProps) {
  const [step, setStep] = useState<Step>('target');
  const [config, setConfig] = useState<AttachAgentConfig | null>(null);

  const agentItems: SelectableItem[] = useMemo(
    () => availableAgents.map(name => ({ id: name, title: name })),
    [availableAgents]
  );

  const goBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('target');
    } else {
      onExit();
    }
  }, [step, onExit]);

  const targetNav = useListNavigation({
    items: agentItems,
    onSelect: item => {
      // Auto-generate sensible defaults
      setConfig({
        targetAgent: item.id,
        name: `invoke${item.id}`,
        description: `Invoke agent ${item.id}`,
        envVarName: `AGENT_${item.id.toUpperCase()}_ARN`,
      });
      setStep('confirm');
    },
    onExit: goBack,
    isActive: step === 'target',
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

  const helpText = step === 'target' ? HELP_TEXT.NAVIGATE_SELECT : HELP_TEXT.CONFIRM_CANCEL;

  return (
    <Screen title={`Attach Agent to ${sourceAgent}`} onExit={onExit} helpText={helpText}>
      <Panel>
        {step === 'target' && (
          <WizardSelect
            title="Select agent to invoke"
            items={agentItems}
            selectedIndex={targetNav.selectedIndex}
            emptyMessage="No other agents available to attach"
          />
        )}

        {step === 'confirm' && config && (
          <ConfirmReview
            fields={[
              { label: 'Target Agent', value: config.targetAgent },
              { label: 'Env Var', value: config.envVarName },
            ]}
          />
        )}
      </Panel>
    </Screen>
  );
}
