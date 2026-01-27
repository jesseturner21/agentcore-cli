import { ConfigIO, NoProjectError, findConfigRoot } from '../../../../lib';
import type { AwsDeploymentTarget } from '../../../../schema';
import { getErrorMessage } from '../../../errors';
import { useCallback, useState } from 'react';

export interface AddTargetResult {
  ok: true;
  targetName: string;
}

export interface AddTargetError {
  ok: false;
  error: string;
}

export type AddTargetOutcome = AddTargetResult | AddTargetError;

/**
 * Hook to add a deployment target to aws-targets.json.
 */
export function useAddTarget() {
  const [isLoading, setIsLoading] = useState(false);

  const addTarget = useCallback(async (target: AwsDeploymentTarget): Promise<AddTargetOutcome> => {
    setIsLoading(true);
    try {
      const configBaseDir = findConfigRoot();
      if (!configBaseDir) {
        return { ok: false, error: new NoProjectError().message };
      }

      const configIO = new ConfigIO({ baseDir: configBaseDir });

      // Read existing targets
      let targets: AwsDeploymentTarget[] = [];
      if (configIO.configExists('awsTargets')) {
        targets = await configIO.readAWSDeploymentTargets();
      }

      // Check for duplicate name
      if (targets.some(t => t.name === target.name)) {
        return { ok: false, error: `Target "${target.name}" already exists.` };
      }

      // Append new target
      targets.push(target);

      // Write back
      await configIO.writeAWSDeploymentTargets(targets);

      return { ok: true, targetName: target.name };
    } catch (err) {
      return { ok: false, error: getErrorMessage(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
  }, []);

  return { addTarget, isLoading, reset };
}

/**
 * Hook to get existing target names.
 */
export function useExistingTargets() {
  const [targets, setTargets] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const configBaseDir = findConfigRoot();
    if (!configBaseDir) {
      setTargets([]);
      return;
    }

    const configIO = new ConfigIO({ baseDir: configBaseDir });
    if (!configIO.configExists('awsTargets')) {
      setTargets([]);
      return;
    }

    const existingTargets = await configIO.readAWSDeploymentTargets();
    setTargets(existingTargets.map(t => t.name));
  }, []);

  return { targets, refresh };
}
