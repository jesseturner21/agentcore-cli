import type { IdentityCredentialVariant } from '../../../../schema';
import type { AddIdentityConfig, AddIdentityStep } from './types';
import { useCallback, useMemo, useState } from 'react';

const ALL_STEPS: AddIdentityStep[] = ['type', 'name', 'apiKey', 'ownerAgent', 'userAgents', 'confirm'];

function getDefaultConfig(singleAgentName?: string): AddIdentityConfig {
  return {
    identityType: 'ApiKeyCredentialProvider',
    name: '',
    apiKey: '',
    ownerAgent: singleAgentName ?? '',
    userAgents: [],
  };
}

export interface UseAddIdentityWizardOptions {
  /** Available agents in the project */
  availableAgents: string[];
}

export function useAddIdentityWizard(options: UseAddIdentityWizardOptions) {
  const { availableAgents } = options;
  const isSingleAgent = availableAgents.length === 1;

  // Compute steps based on agent count - skip agent steps if single agent
  const steps = useMemo<AddIdentityStep[]>(() => {
    if (isSingleAgent) {
      return ALL_STEPS.filter(s => s !== 'ownerAgent' && s !== 'userAgents');
    }
    return ALL_STEPS;
  }, [isSingleAgent]);

  const [config, setConfig] = useState<AddIdentityConfig>(() =>
    getDefaultConfig(isSingleAgent ? availableAgents[0] : undefined)
  );
  const [step, setStep] = useState<AddIdentityStep>('type');

  const currentIndex = steps.indexOf(step);

  const goBack = useCallback(() => {
    const prevStep = steps[currentIndex - 1];
    if (prevStep) setStep(prevStep);
  }, [steps, currentIndex]);

  const nextStep = useCallback(
    (currentStep: AddIdentityStep): AddIdentityStep | undefined => {
      const idx = steps.indexOf(currentStep);
      return steps[idx + 1];
    },
    [steps]
  );

  const setIdentityType = useCallback(
    (identityType: IdentityCredentialVariant) => {
      setConfig(c => ({ ...c, identityType }));
      const next = nextStep('type');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const setName = useCallback(
    (name: string) => {
      setConfig(c => ({ ...c, name }));
      const next = nextStep('name');
      if (next) setStep(next);
    },
    [nextStep]
  );

  const setApiKey = useCallback(
    (apiKey: string) => {
      setConfig(c => ({ ...c, apiKey }));
      const next = nextStep('apiKey');
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
    setStep('type');
  }, [isSingleAgent, availableAgents]);

  return {
    config,
    step,
    steps,
    currentIndex,
    isSingleAgent,
    goBack,
    setIdentityType,
    setName,
    setApiKey,
    setOwnerAgent,
    setUserAgents,
    reset,
  };
}
