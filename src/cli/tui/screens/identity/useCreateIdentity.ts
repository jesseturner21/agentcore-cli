import type { CreateIdentityResult } from '../../../operations/identity/create-identity';
import { createIdentityFromWizard, getAllIdentityNames } from '../../../operations/identity/create-identity';
import type { AddIdentityConfig } from './types';
import { useCallback, useEffect, useState } from 'react';

interface CreateStatus<T> {
  state: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  result?: T;
}

export function useCreateIdentity() {
  const [status, setStatus] = useState<CreateStatus<CreateIdentityResult>>({ state: 'idle' });

  const createIdentity = useCallback(async (config: AddIdentityConfig) => {
    setStatus({ state: 'loading' });
    try {
      const result = await createIdentityFromWizard(config);
      setStatus({ state: 'success', result });
      return { ok: true as const, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create identity.';
      setStatus({ state: 'error', error: message });
      return { ok: false as const, error: message };
    }
  }, []);

  const reset = useCallback(() => {
    setStatus({ state: 'idle' });
  }, []);

  return { status, createIdentity, reset };
}

export function useExistingIdentityNames() {
  const [identityNames, setIdentityNames] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const result = await getAllIdentityNames();
      setIdentityNames(result);
    }
    void load();
  }, []);

  const refresh = useCallback(async () => {
    const result = await getAllIdentityNames();
    setIdentityNames(result);
  }, []);

  return { identityNames, refresh };
}
