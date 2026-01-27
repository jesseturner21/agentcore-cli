import type { AttachGatewayConfig } from '../../../operations/attach';
import { ConfirmReview, Panel, Screen, WizardSelect } from '../../components';
import type { SelectableItem } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation } from '../../hooks';
import React, { useCallback, useMemo, useState } from 'react';

type Step = 'gateway' | 'confirm';

interface AttachGatewayScreenProps {
  sourceAgent: string;
  availableGateways: string[];
  onComplete: (config: AttachGatewayConfig) => void;
  onExit: () => void;
}

export function AttachGatewayScreen({ sourceAgent, availableGateways, onComplete, onExit }: AttachGatewayScreenProps) {
  const [step, setStep] = useState<Step>('gateway');
  const [config, setConfig] = useState<AttachGatewayConfig | null>(null);

  const gatewayItems: SelectableItem[] = useMemo(
    () => availableGateways.map(name => ({ id: name, title: name })),
    [availableGateways]
  );

  const goBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('gateway');
    } else {
      onExit();
    }
  }, [step, onExit]);

  const gatewayNav = useListNavigation({
    items: gatewayItems,
    onSelect: item => {
      const sanitized = item.id.replace(/-/g, '_').toUpperCase();
      // Auto-generate sensible defaults
      setConfig({
        gatewayName: item.id,
        name: `gateway${item.id}`,
        description: `Access gateway ${item.id}`,
        envVarName: `AGENTCORE_GATEWAY_${sanitized}_URL`,
      });
      setStep('confirm');
    },
    onExit: goBack,
    isActive: step === 'gateway',
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

  const helpText = step === 'gateway' ? HELP_TEXT.NAVIGATE_SELECT : HELP_TEXT.CONFIRM_CANCEL;

  return (
    <Screen title={`Attach Gateway to ${sourceAgent}`} onExit={onExit} helpText={helpText}>
      <Panel>
        {step === 'gateway' && (
          <WizardSelect
            title="Select gateway to attach"
            items={gatewayItems}
            selectedIndex={gatewayNav.selectedIndex}
            emptyMessage="No gateways defined in mcp.json"
          />
        )}

        {step === 'confirm' && config && (
          <ConfirmReview
            fields={[
              { label: 'Gateway', value: config.gatewayName },
              { label: 'Env Var', value: config.envVarName },
            ]}
          />
        )}
      </Panel>
    </Screen>
  );
}
