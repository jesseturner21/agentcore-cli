import type { CdkToolkitWrapper, SwitchableIoHost } from '../../../cdk/toolkit-lib';
import { ExecLogger } from '../../../logging';
import { type Step, areStepsComplete, hasStepError } from '../../components';
import { type PreflightContext, useCdkPreflight } from '../../hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';

type PlanPhase = 'idle' | 'running' | 'bootstrap-confirm' | 'complete' | 'error';

interface PlanFlowState {
  phase: PlanPhase;
  steps: Step[];
  context: PreflightContext | null;
  synthOutput: string | null;
  hasError: boolean;
  /** True if the error is specifically due to expired/invalid AWS credentials */
  hasTokenExpiredError: boolean;
  /** True if the error is due to missing AWS credentials (not configured) */
  hasCredentialsError: boolean;
  isComplete: boolean;
  /** CDK toolkit wrapper for direct deploy after plan */
  cdkToolkitWrapper: CdkToolkitWrapper | null;
  /** Stack names from synthesis */
  stackNames: string[];
  /** Switchable ioHost for deploy output */
  switchableIoHost: SwitchableIoHost | null;
  startPlan: () => void;
  confirmBootstrap: () => void;
  skipBootstrap: () => void;
  /** Dispose the CDK toolkit wrapper (call on exit) */
  dispose: () => Promise<void>;
  /** Clear the token expired error state */
  clearTokenExpiredError: () => void;
  /** Clear the credentials error state */
  clearCredentialsError: () => void;
}

interface PlanFlowOptions {
  /** Whether running in interactive TUI mode - affects error message verbosity */
  isInteractive?: boolean;
}

export function usePlanFlow(options: PlanFlowOptions = {}): PlanFlowState {
  const { isInteractive = false } = options;

  // Create logger once for the entire plan flow
  const [logger] = useState(() => new ExecLogger({ command: 'plan' }));

  const preflight = useCdkPreflight({ logger, isInteractive, skipIdentityCheck: true });
  const [diffStep, setDiffStep] = useState<Step>({ label: 'Generate diff (scaffold)', status: 'pending' });
  const [synthOutput, setSynthOutput] = useState<string | null>(null);

  const startPlan = useCallback(() => {
    setDiffStep({ label: 'Generate diff (scaffold)', status: 'pending' });
    setSynthOutput(null);
    void preflight.startPreflight();
  }, [preflight]);

  // Run diff step when preflight completes
  useEffect(() => {
    if (preflight.phase !== 'complete') return;
    if (diffStep.status !== 'pending') return;

    const run = () => {
      logger.startStep('Generate diff');
      setDiffStep(prev => ({ ...prev, status: 'running' }));
      // TODO: Implement actual diff logic
      logger.endStep('success');
      logger.finalize(true);
      setDiffStep(prev => ({ ...prev, status: 'success' }));
      setSynthOutput(`Synthesized ${preflight.stackNames.length} stack(s): ${preflight.stackNames.join(', ')}`);
      // Note: We don't dispose the wrapper here - it's needed for direct deploy
      // The caller should call dispose() when exiting or after deploy
    };

    run();
  }, [preflight.phase, preflight.stackNames, preflight.cdkToolkitWrapper, diffStep.status, logger]);

  // Finalize logger and dispose toolkit when preflight fails
  useEffect(() => {
    if (preflight.phase === 'error') {
      logger.finalize(false);
      void preflight.cdkToolkitWrapper?.dispose();
    }
  }, [preflight.phase, preflight.cdkToolkitWrapper, logger]);

  const steps = useMemo(() => [...preflight.steps, diffStep], [preflight.steps, diffStep]);

  const phase: PlanPhase = useMemo(() => {
    if (preflight.phase === 'idle') return 'idle';
    if (preflight.phase === 'error') return 'error';
    if (preflight.phase === 'bootstrap-confirm') return 'bootstrap-confirm';
    if (preflight.phase === 'running' || preflight.phase === 'bootstrapping') return 'running';
    if (diffStep.status === 'error') return 'error';
    if (diffStep.status === 'success') return 'complete';
    return 'running';
  }, [preflight.phase, diffStep.status]);

  const hasError = hasStepError(steps);
  const isComplete = areStepsComplete(steps);

  const dispose = useCallback(async () => {
    await preflight.cdkToolkitWrapper?.dispose();
  }, [preflight.cdkToolkitWrapper]);

  return {
    phase,
    steps,
    context: preflight.context,
    synthOutput,
    hasError,
    hasTokenExpiredError: preflight.hasTokenExpiredError,
    hasCredentialsError: preflight.hasCredentialsError,
    isComplete,
    cdkToolkitWrapper: preflight.cdkToolkitWrapper,
    stackNames: preflight.stackNames,
    switchableIoHost: preflight.switchableIoHost,
    startPlan,
    confirmBootstrap: preflight.confirmBootstrap,
    skipBootstrap: preflight.skipBootstrap,
    dispose,
    clearTokenExpiredError: preflight.clearTokenExpiredError,
    clearCredentialsError: preflight.clearCredentialsError,
  };
}
