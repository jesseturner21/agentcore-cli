import type { AwsDeploymentTarget } from '../../../../schema';
import { ErrorPrompt, Panel, Screen } from '../../components';
import {
  useAvailableAgents,
  useCreateGateway,
  useCreateMcpTool,
  useExistingGateways,
  useExistingToolNames,
} from '../../hooks/useCreateMcp';
import { AddAgentScreen } from '../agent/AddAgentScreen';
import type { AddAgentConfig } from '../agent/types';
import { useAddAgent } from '../agent/useAddAgent';
import { AddIdentityScreen, useCreateIdentity, useExistingIdentityNames } from '../identity';
import type { AddIdentityConfig } from '../identity';
import { AddGatewayScreen } from '../mcp/AddGatewayScreen';
import { AddMcpToolScreen } from '../mcp/AddMcpToolScreen';
import type { AddGatewayConfig, AddMcpToolConfig } from '../mcp/types';
import { AddMemoryFlow } from '../memory/AddMemoryFlow';
import type { AddResourceType } from './AddScreen';
import { AddScreen } from './AddScreen';
import { AddSuccessScreen } from './AddSuccessScreen';
import { AddTargetScreen } from './AddTargetScreen';
import { useAddTarget, useExistingTargets } from './useAddTarget';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useCallback, useEffect, useRef, useState } from 'react';

type FlowState =
  | { name: 'select' }
  | { name: 'agent-wizard' }
  | { name: 'gateway-wizard' }
  | { name: 'tool-wizard' }
  | { name: 'memory-wizard' }
  | { name: 'identity-wizard' }
  | { name: 'target-wizard' }
  | { name: 'loading'; message: string }
  | { name: 'agent-create-success'; agentName: string; projectPath: string }
  | { name: 'agent-byo-success'; agentName: string }
  | { name: 'gateway-success'; gatewayName: string }
  | { name: 'tool-success'; toolName: string; projectPath: string }
  | { name: 'identity-success'; identityName: string }
  | { name: 'target-success'; targetName: string }
  | { name: 'error'; message: string };

interface AddFlowProps {
  /** Whether running in interactive TUI mode (from App.tsx) vs CLI mode */
  isInteractive: boolean;
  onExit: () => void;
  /** Navigate to another command (e.g., 'attach') */
  onNavigate?: (command: string) => void;
}

export function AddFlow(props: AddFlowProps) {
  const { addAgent, reset: resetAgent } = useAddAgent();
  const { createGateway, reset: resetGateway } = useCreateGateway();
  const { createTool, reset: resetTool } = useCreateMcpTool();
  const { createIdentity, reset: resetIdentity } = useCreateIdentity();
  const { addTarget, reset: resetTarget } = useAddTarget();
  const { gateways, refresh } = useExistingGateways();
  const { agents, isLoading: isLoadingAgents, refresh: refreshAgents } = useAvailableAgents();
  const { toolNames } = useExistingToolNames();
  const { identityNames, refresh: refreshIdentityNames } = useExistingIdentityNames();
  const { targets, refresh: refreshTargets } = useExistingTargets();
  const [flow, setFlow] = useState<FlowState>({ name: 'select' });

  // Track pending result state - ensures loading screen renders before success/error
  const pendingResultRef = useRef<FlowState | null>(null);
  const [resultReady, setResultReady] = useState(false);

  // Process pending result after loading screen has rendered
  useEffect(() => {
    if (flow.name === 'loading' && resultReady && pendingResultRef.current) {
      const pendingResult = pendingResultRef.current;
      pendingResultRef.current = null;
      // Defer state updates to avoid synchronous setState within effect
      setTimeout(() => {
        setResultReady(false);
        setFlow(pendingResult);
      }, 1);
    }
  }, [flow.name, resultReady]);

  // Load existing targets on mount
  useEffect(() => {
    void refreshTargets();
  }, [refreshTargets]);

  // In non-interactive mode, exit after success
  useEffect(() => {
    if (!props.isInteractive) {
      const successStates = [
        'agent-create-success',
        'agent-byo-success',
        'gateway-success',
        'tool-success',
        'identity-success',
        'target-success',
      ];
      if (successStates.includes(flow.name)) {
        props.onExit();
      }
    }
  }, [props.isInteractive, flow.name, props.onExit]);

  const handleSelectResource = useCallback((resourceType: AddResourceType) => {
    switch (resourceType) {
      case 'agent':
        setFlow({ name: 'agent-wizard' });
        break;
      case 'gateway':
        setFlow({ name: 'gateway-wizard' });
        break;
      case 'mcp-tool':
        setFlow({ name: 'tool-wizard' });
        break;
      case 'memory':
        setFlow({ name: 'memory-wizard' });
        break;
      case 'identity':
        setFlow({ name: 'identity-wizard' });
        break;
      case 'target':
        setFlow({ name: 'target-wizard' });
        break;
    }
  }, []);

  const handleAddAgent = useCallback(
    (config: AddAgentConfig) => {
      pendingResultRef.current = null;
      setResultReady(false);
      setFlow({ name: 'loading', message: 'Creating agent...' });
      void addAgent(config).then(result => {
        if (result.ok) {
          if (result.type === 'create') {
            pendingResultRef.current = {
              name: 'agent-create-success',
              agentName: result.agentName,
              projectPath: result.projectPath,
            };
          } else {
            pendingResultRef.current = { name: 'agent-byo-success', agentName: result.agentName };
          }
        } else {
          pendingResultRef.current = { name: 'error', message: result.error };
        }
        setResultReady(true);
      });
    },
    [addAgent]
  );

  const handleCreateGateway = useCallback(
    (config: AddGatewayConfig) => {
      pendingResultRef.current = null;
      setResultReady(false);
      setFlow({ name: 'loading', message: 'Creating gateway...' });
      void createGateway(config).then(result => {
        if (result.ok) {
          pendingResultRef.current = { name: 'gateway-success', gatewayName: result.result.name };
        } else {
          pendingResultRef.current = { name: 'error', message: result.error };
        }
        setResultReady(true);
      });
    },
    [createGateway]
  );

  const handleCreateTool = useCallback(
    (config: AddMcpToolConfig) => {
      pendingResultRef.current = null;
      setResultReady(false);
      setFlow({ name: 'loading', message: 'Creating MCP tool...' });
      void createTool(config).then(res => {
        if (res.ok) {
          const { toolName, projectPath } = res.result;
          pendingResultRef.current = { name: 'tool-success', toolName, projectPath };
        } else {
          pendingResultRef.current = { name: 'error', message: res.error };
        }
        setResultReady(true);
      });
    },
    [createTool]
  );

  const handleAddTarget = useCallback(
    (target: AwsDeploymentTarget) => {
      pendingResultRef.current = null;
      setResultReady(false);
      setFlow({ name: 'loading', message: 'Adding target...' });
      void addTarget(target).then(result => {
        if (result.ok) {
          pendingResultRef.current = { name: 'target-success', targetName: result.targetName };
        } else {
          pendingResultRef.current = { name: 'error', message: result.error };
        }
        setResultReady(true);
      });
    },
    [addTarget]
  );

  const handleCreateIdentity = useCallback(
    (config: AddIdentityConfig) => {
      pendingResultRef.current = null;
      setResultReady(false);
      setFlow({ name: 'loading', message: 'Creating identity...' });
      void createIdentity(config).then(result => {
        if (result.ok) {
          pendingResultRef.current = { name: 'identity-success', identityName: result.result.name };
        } else {
          pendingResultRef.current = { name: 'error', message: result.error };
        }
        setResultReady(true);
      });
    },
    [createIdentity]
  );

  if (flow.name === 'select') {
    // Show screen immediately - loading is instant for local files
    return (
      <AddScreen
        onSelect={handleSelectResource}
        onExit={props.onExit}
        hasAgents={!isLoadingAgents && agents.length > 0}
      />
    );
  }

  if (flow.name === 'loading') {
    // Disable exit during loading - no-op handler
    const noop = () => undefined;
    return (
      <Screen title="Add Resource" onExit={noop}>
        <Panel>
          <Text>
            <Spinner type="dots" /> {flow.message}
          </Text>
        </Panel>
      </Screen>
    );
  }

  if (flow.name === 'agent-wizard') {
    return (
      <AddAgentScreen
        existingAgentNames={agents}
        onComplete={handleAddAgent}
        onExit={() => setFlow({ name: 'select' })}
      />
    );
  }

  if (flow.name === 'agent-create-success') {
    return (
      <AddSuccessScreen
        isInteractive={props.isInteractive}
        message={`Created agent: ${flow.agentName}`}
        detail={`Project created at ${flow.projectPath}. Deploy with \`agentcore deploy\`.`}
        onAddAnother={() => {
          void refreshAgents().then(() => setFlow({ name: 'select' }));
        }}
        onAttach={() => props.onNavigate?.('attach')}
        onExit={props.onExit}
      />
    );
  }

  if (flow.name === 'agent-byo-success') {
    return (
      <AddSuccessScreen
        isInteractive={props.isInteractive}
        message={`Added agent: ${flow.agentName}`}
        detail="Agent added to `agentcore/agentcore.json`. Deploy with `agentcore deploy`."
        onAddAnother={() => {
          void refreshAgents().then(() => setFlow({ name: 'select' }));
        }}
        onAttach={() => props.onNavigate?.('attach')}
        onExit={props.onExit}
      />
    );
  }

  if (flow.name === 'gateway-wizard') {
    return (
      <AddGatewayScreen
        existingGateways={gateways}
        availableAgents={agents}
        onComplete={handleCreateGateway}
        onExit={() => setFlow({ name: 'select' })}
      />
    );
  }

  if (flow.name === 'tool-wizard') {
    return (
      <AddMcpToolScreen
        existingGateways={gateways}
        existingAgents={agents}
        existingToolNames={toolNames}
        onComplete={handleCreateTool}
        onExit={() => setFlow({ name: 'select' })}
      />
    );
  }

  if (flow.name === 'memory-wizard') {
    return (
      <AddMemoryFlow
        isInteractive={props.isInteractive}
        onBack={() => setFlow({ name: 'select' })}
        onExit={props.onExit}
      />
    );
  }

  if (flow.name === 'identity-wizard') {
    return (
      <AddIdentityScreen
        existingIdentityNames={identityNames}
        availableAgents={agents}
        onComplete={handleCreateIdentity}
        onExit={() => setFlow({ name: 'select' })}
      />
    );
  }

  if (flow.name === 'target-wizard') {
    return (
      <AddTargetScreen
        existingTargetNames={targets}
        onComplete={handleAddTarget}
        onExit={() => setFlow({ name: 'select' })}
      />
    );
  }

  if (flow.name === 'gateway-success') {
    return (
      <AddSuccessScreen
        isInteractive={props.isInteractive}
        message={`Added gateway: ${flow.gatewayName}`}
        detail="Gateway defined in `agentcore/mcp.json`."
        onAddAnother={() => {
          void refresh().then(() => setFlow({ name: 'select' }));
        }}
        onAttach={() => props.onNavigate?.('attach')}
        onExit={props.onExit}
      />
    );
  }

  if (flow.name === 'tool-success') {
    return (
      <AddSuccessScreen
        isInteractive={props.isInteractive}
        message={`Added MCP tool: ${flow.toolName}`}
        detail={`Project created at ${flow.projectPath}`}
        onAddAnother={() => setFlow({ name: 'select' })}
        onAttach={() => props.onNavigate?.('attach')}
        onExit={props.onExit}
      />
    );
  }

  if (flow.name === 'identity-success') {
    return (
      <AddSuccessScreen
        isInteractive={props.isInteractive}
        message={`Added identity: ${flow.identityName}`}
        detail="`agentcore/.env` updated."
        onAddAnother={() => {
          void refreshIdentityNames().then(() => setFlow({ name: 'select' }));
        }}
        onAttach={() => props.onNavigate?.('attach')}
        onExit={props.onExit}
      />
    );
  }

  if (flow.name === 'target-success') {
    return (
      <AddSuccessScreen
        isInteractive={props.isInteractive}
        message={`Added target: ${flow.targetName}`}
        detail="Target defined in `agentcore/aws-targets.json`."
        onAddAnother={() => {
          void refreshTargets().then(() => setFlow({ name: 'select' }));
        }}
        onAttach={() => props.onNavigate?.('attach')}
        onExit={props.onExit}
      />
    );
  }

  return (
    <ErrorPrompt
      message="Failed to add resource"
      detail={flow.message}
      onBack={() => {
        resetAgent();
        resetGateway();
        resetTool();
        resetIdentity();
        resetTarget();
        setFlow({ name: 'select' });
      }}
      onExit={props.onExit}
    />
  );
}
