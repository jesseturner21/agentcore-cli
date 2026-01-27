import type { MemoryStrategyType } from '../../../../schema';
import type { AddMemoryConfig, AddMemoryStep, AddMemoryStrategyConfig } from './types';
import { DEFAULT_EVENT_EXPIRY } from './types';
import { useCallback, useMemo, useState } from 'react';

const ALL_STEPS: AddMemoryStep[] = [
  'name',
  'description',
  'expiry',
  'strategies',
  'ownerAgent',
  'userAgents',
  'confirm',
];

function getDefaultConfig(singleAgentName?: string): AddMemoryConfig {
  return {
    name: '',
    description: '',
    eventExpiryDuration: DEFAULT_EVENT_EXPIRY,
    strategies: [],
    ownerAgent: singleAgentName ?? '',
    userAgents: [],
  };
}

interface UseAddMemoryWizardOptions {
  availableAgents: string[];
}

export function useAddMemoryWizard(options: UseAddMemoryWizardOptions) {
  const { availableAgents } = options;
  const isSingleAgent = availableAgents.length === 1;

  // Compute steps based on agent count - skip agent steps if single agent
  const steps = useMemo<AddMemoryStep[]>(() => {
    if (isSingleAgent) {
      return ALL_STEPS.filter(s => s !== 'ownerAgent' && s !== 'userAgents');
    }
    return ALL_STEPS;
  }, [isSingleAgent]);

  const [config, setConfig] = useState<AddMemoryConfig>(() =>
    getDefaultConfig(isSingleAgent ? availableAgents[0] : undefined)
  );
  const [step, setStep] = useState<AddMemoryStep>('name');

  const currentIndex = steps.indexOf(step);

  const goBack = useCallback(() => {
    const prevStep = steps[currentIndex - 1];
    if (prevStep) setStep(prevStep);
  }, [steps, currentIndex]);

  const nextStep = useCallback(
    (currentStep: AddMemoryStep): AddMemoryStep | undefined => {
      const idx = steps.indexOf(currentStep);
      return steps[idx + 1];
    },
    [steps]
  );

  const setName = useCallback(
    (name: string) => {
      setConfig(c => ({ ...c, name }));
      const next = nextStep('name');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const setDescription = useCallback(
    (description: string) => {
      setConfig(c => ({ ...c, description }));
      const next = nextStep('description');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const setExpiry = useCallback(
    (eventExpiryDuration: number) => {
      setConfig(c => ({ ...c, eventExpiryDuration }));
      const next = nextStep('expiry');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const setStrategyTypes = useCallback(
    (types: MemoryStrategyType[]) => {
      const strategies: AddMemoryStrategyConfig[] = types.map(type => ({ type }));
      setConfig(c => ({ ...c, strategies }));
      const next = nextStep('strategies');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const setOwnerAgent = useCallback(
    (ownerAgent: string) => {
      setConfig(c => ({ ...c, ownerAgent, userAgents: [] }));
      const next = nextStep('ownerAgent');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const setUserAgents = useCallback(
    (userAgents: string[]) => {
      setConfig(c => ({ ...c, userAgents }));
      const next = nextStep('userAgents');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const reset = useCallback(() => {
    setConfig(getDefaultConfig(isSingleAgent ? availableAgents[0] : undefined));
    setStep('name');
  }, [isSingleAgent, availableAgents]);

  return {
    config,
    step,
    steps,
    currentIndex,
    isSingleAgent,
    goBack,
    setName,
    setDescription,
    setExpiry,
    setStrategyTypes,
    setOwnerAgent,
    setUserAgents,
    reset,
  };
}
