import { CONFIG_DIR, getWorkingDirectory } from '../../../../lib';
import { getErrorMessage } from '../../../errors';
import {
  type DeployedTarget,
  destroyTarget,
  discoverDeployedTargets,
  getCdkProjectDir,
} from '../../../operations/destroy';
import { type Step, hasStepError } from '../../components';
import { withMinDuration } from '../../utils';
import { existsSync } from 'fs';
import { join } from 'path';
import { useCallback, useEffect, useMemo, useState } from 'react';

type DestroyPhase = 'checking' | 'not-found' | 'select' | 'confirm' | 'destroying' | 'complete';

interface DestroyFlowState {
  phase: DestroyPhase;
  deployedTargets: DeployedTarget[];
  selectedTarget: DeployedTarget | null;
  steps: Step[];
  hasError: boolean;
  selectTarget: (target: DeployedTarget) => void;
  confirmDestroy: () => void;
  cancelDestroy: () => void;
  reset: () => void;
}

export function useDestroyFlow(): DestroyFlowState {
  const [phase, setPhase] = useState<DestroyPhase>('checking');
  const [deployedTargets, setDeployedTargets] = useState<DeployedTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<DeployedTarget | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  const cwd = useMemo(() => getWorkingDirectory(), []);
  const configDir = useMemo(() => join(cwd, CONFIG_DIR), [cwd]);

  // Check for deployed stacks on mount
  useEffect(() => {
    if (phase !== 'checking') return;

    const checkDeployed = async () => {
      if (!existsSync(configDir)) {
        setPhase('not-found');
        return;
      }

      try {
        const result = await discoverDeployedTargets();
        if (result.deployedTargets.length === 0) {
          setPhase('not-found');
          return;
        }
        setDeployedTargets(result.deployedTargets);
        setPhase('select');
      } catch {
        setPhase('not-found');
      }
    };

    void checkDeployed();
  }, [phase, configDir]);

  const selectTarget = useCallback((target: DeployedTarget) => {
    setSelectedTarget(target);
    setPhase('confirm');
  }, []);

  const confirmDestroy = useCallback(() => {
    if (!selectedTarget) return;
    setSteps([{ label: `Destroy stack: ${selectedTarget.stack.stackName}`, status: 'pending' }]);
    setPhase('destroying');
  }, [selectedTarget]);

  const cancelDestroy = useCallback(() => {
    setSelectedTarget(null);
    setPhase('select');
  }, []);

  const reset = useCallback(() => {
    setSelectedTarget(null);
    setSteps([]);
    setPhase('checking');
  }, []);

  const updateStep = (index: number, update: Partial<Step>) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  };

  // Destroy effect
  useEffect(() => {
    if (phase !== 'destroying' || !selectedTarget) return;

    let isRunning = false;
    const runDestroy = async () => {
      if (isRunning) return;
      isRunning = true;

      try {
        updateStep(0, { status: 'running' });
        const cdkProjectDir = getCdkProjectDir(cwd);

        await withMinDuration(async () => {
          await destroyTarget({ target: selectedTarget, cdkProjectDir });
        });

        updateStep(0, { status: 'success' });
        setPhase('complete');
      } catch (err) {
        updateStep(0, { status: 'error', error: getErrorMessage(err) });
        setPhase('complete');
      }
    };

    void runDestroy();
  }, [phase, selectedTarget, cwd]);

  const hasError = hasStepError(steps);

  return {
    phase,
    deployedTargets,
    selectedTarget,
    steps,
    hasError,
    selectTarget,
    confirmDestroy,
    cancelDestroy,
    reset,
  };
}
