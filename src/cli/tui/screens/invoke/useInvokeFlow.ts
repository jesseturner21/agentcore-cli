import { ConfigIO } from '../../../../lib';
import type {
  AgentCoreDeployedState,
  AwsDeploymentTarget,
  AgentCoreProjectSpec as _AgentCoreProjectSpec,
} from '../../../../schema';
import { invokeAgentRuntimeStreaming } from '../../../aws';
import { getErrorMessage } from '../../../errors';
import { InvokeLogger } from '../../../logging';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface InvokeConfig {
  agents: { name: string; state: AgentCoreDeployedState }[];
  target: AwsDeploymentTarget;
  projectName: string;
}

export interface InvokeFlowState {
  phase: 'loading' | 'ready' | 'invoking' | 'error';
  config: InvokeConfig | null;
  selectedAgent: number;
  messages: { role: 'user' | 'assistant'; content: string }[];
  error: string | null;
  logFilePath: string | null;
  selectAgent: (index: number) => void;
  invoke: (prompt: string) => Promise<void>;
}

export function useInvokeFlow(): InvokeFlowState {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'invoking' | 'error'>('loading');
  const [config, setConfig] = useState<InvokeConfig | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logFilePath, setLogFilePath] = useState<string | null>(null);

  // Persistent logger for the session
  const loggerRef = useRef<InvokeLogger | null>(null);

  // Load config on mount
  useEffect(() => {
    const load = async () => {
      try {
        const configIO = new ConfigIO();
        const project = await configIO.readProjectSpec();
        const deployedState = await configIO.readDeployedState();
        const awsTargets = await configIO.readAWSDeploymentTargets();

        const targetNames = Object.keys(deployedState.targets);
        if (targetNames.length === 0) {
          setError('No deployed targets found. Run `agentcore deploy` first.');
          setPhase('error');
          return;
        }

        const targetName = targetNames[0]!;
        const targetState = deployedState.targets[targetName];
        const targetConfig = awsTargets.find(t => t.name === targetName);

        if (!targetConfig) {
          setError(`Target config '${targetName}' not found`);
          setPhase('error');
          return;
        }

        const agents: InvokeConfig['agents'] = [];
        for (const agent of project.agents) {
          const state = targetState?.resources?.agents?.[agent.name];
          if (state) {
            agents.push({ name: agent.name, state });
          }
        }

        if (agents.length === 0) {
          setError('No deployed agents found. Run `agentcore deploy` first.');
          setPhase('error');
          return;
        }

        setConfig({ agents, target: targetConfig, projectName: project.name });
        setPhase('ready');
      } catch (err) {
        setError(getErrorMessage(err));
        setPhase('error');
      }
    };
    void load();
  }, []);

  // Track current streaming content to avoid stale closure issues
  const streamingContentRef = useRef('');

  const invoke = useCallback(
    async (prompt: string) => {
      if (!config || phase === 'invoking') return;

      const agent = config.agents[selectedAgent];
      if (!agent) return;

      // Create logger on first invoke or if agent changed
      if (!loggerRef.current) {
        loggerRef.current = new InvokeLogger({
          agentName: agent.name,
          runtimeArn: agent.state.runtimeArn,
          region: config.target.region,
        });
        // Store the absolute path for the LogLink component
        setLogFilePath(loggerRef.current.getAbsoluteLogPath());
      }

      const logger = loggerRef.current;

      // Clear previous messages and start fresh with new user message and empty assistant message
      setMessages([
        { role: 'user', content: prompt },
        { role: 'assistant', content: '' },
      ]);
      setPhase('invoking');
      streamingContentRef.current = '';

      logger.logPrompt(prompt);

      try {
        const stream = invokeAgentRuntimeStreaming({
          region: config.target.region,
          runtimeArn: agent.state.runtimeArn,
          payload: prompt,
        });

        for await (const chunk of stream) {
          streamingContentRef.current += chunk;
          const currentContent = streamingContentRef.current;
          // Update the last message (assistant) with accumulated content
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx]?.role === 'assistant') {
              updated[lastIdx] = { role: 'assistant', content: currentContent };
            }
            return updated;
          });
        }

        logger.logResponse(streamingContentRef.current);
        setPhase('ready');
      } catch (err) {
        const errMsg = getErrorMessage(err);
        logger.logError(err, 'invoke streaming failed');

        // Update the last message with error
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = { role: 'assistant', content: `Error: ${errMsg}` };
          }
          return updated;
        });
        setPhase('ready');
      }
    },
    [config, selectedAgent, phase]
  );

  return {
    phase,
    config,
    selectedAgent,
    messages,
    error,
    logFilePath,
    selectAgent: setSelectedAgent,
    invoke,
  };
}
