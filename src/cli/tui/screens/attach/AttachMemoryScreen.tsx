import type { Access } from '../../../../schema';
import type { AttachMemoryConfig } from '../../../operations/attach';
import { ConfirmReview, Panel, Screen, WizardSelect } from '../../components';
import type { SelectableItem } from '../../components';
import { HELP_TEXT } from '../../constants';
import { useListNavigation } from '../../hooks';
import React, { useCallback, useMemo, useState } from 'react';

type Step = 'memory' | 'access' | 'confirm';

const ACCESS_OPTIONS: SelectableItem[] = [
  { id: 'readwrite', title: 'Read/Write', description: 'Full access to memory' },
  { id: 'read', title: 'Read Only', description: 'Can read but not write to memory' },
];

interface AttachMemoryScreenProps {
  sourceAgent: string;
  availableMemories: string[];
  onComplete: (config: AttachMemoryConfig) => void;
  onExit: () => void;
}

export function AttachMemoryScreen({ sourceAgent, availableMemories, onComplete, onExit }: AttachMemoryScreenProps) {
  const [step, setStep] = useState<Step>('memory');
  const [config, setConfig] = useState<Partial<AttachMemoryConfig>>({});

  const memoryItems: SelectableItem[] = useMemo(
    () => availableMemories.map(name => ({ id: name, title: name })),
    [availableMemories]
  );

  const goBack = useCallback(() => {
    switch (step) {
      case 'access':
        setStep('memory');
        break;
      case 'confirm':
        setStep('access');
        break;
      default:
        onExit();
    }
  }, [step, onExit]);

  const memoryNav = useListNavigation({
    items: memoryItems,
    onSelect: item => {
      const sanitized = item.id.toUpperCase().replace(/-/g, '_');
      setConfig({
        memoryName: item.id,
        access: 'readwrite',
        envVarName: `AGENTCORE_MEMORY_${sanitized}_ID`,
      });
      setStep('access');
    },
    onExit: goBack,
    isActive: step === 'memory',
  });

  const accessNav = useListNavigation({
    items: ACCESS_OPTIONS,
    onSelect: item => {
      setConfig(c => ({ ...c, access: item.id as Access }));
      setStep('confirm');
    },
    onExit: goBack,
    isActive: step === 'access',
  });

  useListNavigation({
    items: [{ id: 'confirm', title: 'Confirm' }],
    onSelect: () => {
      if (config.memoryName && config.access && config.envVarName) {
        onComplete(config as AttachMemoryConfig);
      }
    },
    onExit: goBack,
    isActive: step === 'confirm',
  });

  const helpText = step === 'confirm' ? HELP_TEXT.CONFIRM_CANCEL : HELP_TEXT.NAVIGATE_SELECT;

  return (
    <Screen title={`Attach Memory to ${sourceAgent}`} onExit={onExit} helpText={helpText}>
      <Panel>
        {step === 'memory' && (
          <WizardSelect
            title="Select memory to attach"
            items={memoryItems}
            selectedIndex={memoryNav.selectedIndex}
            emptyMessage="No memories available to attach"
          />
        )}

        {step === 'access' && (
          <WizardSelect title="Select access level" items={ACCESS_OPTIONS} selectedIndex={accessNav.selectedIndex} />
        )}

        {step === 'confirm' && (
          <ConfirmReview
            fields={[
              { label: 'Memory', value: config.memoryName ?? '' },
              { label: 'Access', value: config.access === 'readwrite' ? 'Read/Write' : 'Read Only' },
              { label: 'Env Var', value: config.envVarName ?? '' },
            ]}
          />
        )}
      </Panel>
    </Screen>
  );
}
