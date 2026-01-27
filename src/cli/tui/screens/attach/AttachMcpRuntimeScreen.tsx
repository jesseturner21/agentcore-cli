import type { BindMcpRuntimeConfig } from '../../../operations/attach';
import { ConfirmReview, Panel, Screen, WizardSelect } from '../../components';
import type { SelectableItem } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation } from '../../hooks';
import React, { useCallback, useMemo, useState } from 'react';

type Step = 'runtime' | 'confirm';

interface AttachMcpRuntimeScreenProps {
  sourceAgent: string;
  availableMcpRuntimes: string[];
  onComplete: (mcpRuntimeName: string, config: BindMcpRuntimeConfig) => void;
  onExit: () => void;
}

export function AttachMcpRuntimeScreen({
  sourceAgent,
  availableMcpRuntimes,
  onComplete,
  onExit,
}: AttachMcpRuntimeScreenProps) {
  const [step, setStep] = useState<Step>('runtime');
  const [selectedRuntime, setSelectedRuntime] = useState<string | null>(null);
  const [config, setConfig] = useState<BindMcpRuntimeConfig | null>(null);

  const runtimeItems: SelectableItem[] = useMemo(
    () => availableMcpRuntimes.map(name => ({ id: name, title: name })),
    [availableMcpRuntimes]
  );

  const goBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('runtime');
    } else {
      onExit();
    }
  }, [step, onExit]);

  const runtimeNav = useListNavigation({
    items: runtimeItems,
    onSelect: item => {
      const sanitized = item.id.replace(/-/g, '_').toUpperCase();
      setSelectedRuntime(item.id);
      // Auto-generate sensible defaults
      setConfig({
        agentName: sourceAgent,
        envVarName: `MCPRUNTIME_${sanitized}_ARN`,
      });
      setStep('confirm');
    },
    onExit: goBack,
    isActive: step === 'runtime',
  });

  useListNavigation({
    items: [{ id: 'confirm', title: 'Confirm' }],
    onSelect: () => {
      if (selectedRuntime && config) {
        onComplete(selectedRuntime, config);
      }
    },
    onExit: goBack,
    isActive: step === 'confirm',
  });

  const helpText = step === 'runtime' ? HELP_TEXT.NAVIGATE_SELECT : HELP_TEXT.CONFIRM_CANCEL;

  return (
    <Screen title={`Bind ${sourceAgent} to MCP Runtime`} onExit={onExit} helpText={helpText}>
      <Panel>
        {step === 'runtime' && (
          <WizardSelect
            title="Select MCP runtime to bind"
            items={runtimeItems}
            selectedIndex={runtimeNav.selectedIndex}
            emptyMessage="No MCP runtimes defined in mcp.json"
          />
        )}

        {step === 'confirm' && config && selectedRuntime && (
          <ConfirmReview
            fields={[
              { label: 'MCP Runtime', value: selectedRuntime },
              { label: 'Agent', value: config.agentName },
              { label: 'Env Var', value: config.envVarName },
            ]}
          />
        )}
      </Panel>
    </Screen>
  );
}
