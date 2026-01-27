import {
  attachAgentToAgent,
  attachGatewayToAgent,
  attachIdentityToAgent,
  attachMemoryToAgent,
  bindMcpRuntimeToAgent,
  getAgentAttachments,
  getAvailableAgents,
  getGateways,
  getMcpRuntimeTools,
  getOwnedIdentities,
  getOwnedMemories,
} from '../../operations/attach';
import type {
  AttachAgentConfig,
  AttachGatewayConfig,
  AttachIdentityConfig,
  AttachMemoryConfig,
  BindMcpRuntimeConfig,
} from '../../operations/attach';
import { useCallback, useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Data Loading Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useAgents() {
  const [agents, setAgents] = useState<string[] | null>(null);

  useEffect(() => {
    void getAvailableAgents().then(setAgents);
  }, []);

  const refresh = useCallback(async () => {
    const result = await getAvailableAgents();
    setAgents(result);
  }, []);

  return { agents: agents ?? [], isLoading: agents === null, refresh };
}

export function useOwnedMemories() {
  const [memories, setMemories] = useState<{ name: string; ownerAgent: string }[]>([]);

  useEffect(() => {
    void getOwnedMemories().then(setMemories);
  }, []);

  const refresh = useCallback(async () => {
    const result = await getOwnedMemories();
    setMemories(result);
  }, []);

  return { memories, refresh };
}

export function useOwnedIdentities() {
  const [identities, setIdentities] = useState<{ name: string; ownerAgent: string }[]>([]);

  useEffect(() => {
    void getOwnedIdentities().then(setIdentities);
  }, []);

  const refresh = useCallback(async () => {
    const result = await getOwnedIdentities();
    setIdentities(result);
  }, []);

  return { identities, refresh };
}

export function useMcpRuntimeTools() {
  const [tools, setTools] = useState<string[]>([]);

  useEffect(() => {
    void getMcpRuntimeTools().then(setTools);
  }, []);

  const refresh = useCallback(async () => {
    const result = await getMcpRuntimeTools();
    setTools(result);
  }, []);

  return { tools, refresh };
}

export function useGateways() {
  const [gateways, setGateways] = useState<string[]>([]);

  useEffect(() => {
    void getGateways().then(setGateways);
  }, []);

  const refresh = useCallback(async () => {
    const result = await getGateways();
    setGateways(result);
  }, []);

  return { gateways, refresh };
}

export function useAgentAttachments(agentName: string | null) {
  const [attachments, setAttachments] = useState<{
    memories: string[];
    identities: string[];
    remoteTools: string[];
    mcpProviders: string[];
  }>({
    memories: [],
    identities: [],
    remoteTools: [],
    mcpProviders: [],
  });

  useEffect(() => {
    if (agentName) {
      void getAgentAttachments(agentName).then(setAttachments);
    }
  }, [agentName]);

  return attachments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attach Operation Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useAttachAgent() {
  const [isLoading, setIsLoading] = useState(false);

  const attach = useCallback(async (sourceAgent: string, config: AttachAgentConfig) => {
    setIsLoading(true);
    try {
      await attachAgentToAgent(sourceAgent, config);
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to attach agent.';
      return { ok: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => setIsLoading(false), []);

  return { attach, isLoading, reset };
}

export function useBindMcpRuntime() {
  const [isLoading, setIsLoading] = useState(false);

  const bind = useCallback(async (mcpRuntimeName: string, config: BindMcpRuntimeConfig) => {
    setIsLoading(true);
    try {
      await bindMcpRuntimeToAgent(mcpRuntimeName, config);
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to bind agent to MCP runtime.';
      return { ok: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => setIsLoading(false), []);

  return { bind, isLoading, reset };
}

export function useAttachMemory() {
  const [isLoading, setIsLoading] = useState(false);

  const attach = useCallback(async (agentName: string, config: AttachMemoryConfig) => {
    setIsLoading(true);
    try {
      await attachMemoryToAgent(agentName, config);
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to attach memory.';
      return { ok: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => setIsLoading(false), []);

  return { attach, isLoading, reset };
}

export function useAttachIdentity() {
  const [isLoading, setIsLoading] = useState(false);

  const attach = useCallback(async (agentName: string, config: AttachIdentityConfig) => {
    setIsLoading(true);
    try {
      await attachIdentityToAgent(agentName, config);
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to attach identity.';
      return { ok: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => setIsLoading(false), []);

  return { attach, isLoading, reset };
}

export function useAttachGateway() {
  const [isLoading, setIsLoading] = useState(false);

  const attach = useCallback(async (agentName: string, config: AttachGatewayConfig) => {
    setIsLoading(true);
    try {
      await attachGatewayToAgent(agentName, config);
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to attach gateway.';
      return { ok: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => setIsLoading(false), []);

  return { attach, isLoading, reset };
}
