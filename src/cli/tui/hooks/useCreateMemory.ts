import type { CreateMemoryResult } from '../../operations/memory/create-memory';
import { createMemoryFromWizard, getAllMemoryNames, getAvailableAgents } from '../../operations/memory/create-memory';
import type { AddMemoryConfig } from '../screens/memory/types';
import { useCallback, useEffect, useState } from 'react';

interface CreateStatus<T> {
  state: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  result?: T;
}

export function useCreateMemory() {
  const [status, setStatus] = useState<CreateStatus<CreateMemoryResult>>({ state: 'idle' });

  const createMemory = useCallback(async (config: AddMemoryConfig) => {
    setStatus({ state: 'loading' });
    try {
      const result = await createMemoryFromWizard(config);
      setStatus({ state: 'success', result });
      return { ok: true as const, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create memory.';
      setStatus({ state: 'error', error: message });
      return { ok: false as const, error: message };
    }
  }, []);

  const reset = useCallback(() => {
    setStatus({ state: 'idle' });
  }, []);

  return { status, createMemory, reset };
}

export function useExistingMemoryNames() {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const result = await getAllMemoryNames();
      setNames(result);
    }
    void load();
  }, []);

  const refresh = useCallback(async () => {
    const result = await getAllMemoryNames();
    setNames(result);
  }, []);

  return { names, refresh };
}

export function useAvailableAgentsForMemory() {
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const result = await getAvailableAgents();
      setAgents(result);
    }
    void load();
  }, []);

  const refresh = useCallback(async () => {
    const result = await getAvailableAgents();
    setAgents(result);
  }, []);

  return { agents, refresh };
}
