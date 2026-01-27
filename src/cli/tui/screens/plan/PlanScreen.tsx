import { ConfigIO } from '../../../../lib';
import type { AgentCoreMcpSpec } from '../../../../schema';
import {
  AwsTargetConfigUI,
  ConfirmPrompt,
  type NextStep,
  NextSteps,
  ResourceGraph,
  Screen,
  StepProgress,
  getAwsConfigHelpText,
} from '../../components';
import { BOOTSTRAP, HELP_TEXT } from '../../constants';
import { useAwsTargetConfig } from '../../hooks';
import { DeployScreen } from '../deploy';
import { usePlanFlow } from './usePlanFlow';
import { Box, Text } from 'ink';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface PlanScreenProps {
  /** Whether running in interactive TUI mode (from App.tsx) vs CLI mode */
  isInteractive: boolean;
  onExit: () => void;
  autoConfirm?: boolean;
  onShellCommand?: (command: string) => void;
}

/** Next steps shown after successful plan */
const PLAN_NEXT_STEPS: NextStep[] = [{ command: 'deploy', label: 'Deploy to AWS' }];

export function PlanScreen({ isInteractive, onExit, autoConfirm, onShellCommand }: PlanScreenProps) {
  const awsConfig = useAwsTargetConfig();
  const {
    phase,
    steps,
    context,
    synthOutput,
    hasError,
    hasTokenExpiredError,
    hasCredentialsError,
    isComplete,
    cdkToolkitWrapper,
    stackNames,
    switchableIoHost,
    startPlan,
    confirmBootstrap,
    skipBootstrap,
    dispose,
    clearTokenExpiredError,
    clearCredentialsError,
  } = usePlanFlow({ isInteractive });
  const allSuccess = !hasError && isComplete;
  const [showDeploy, setShowDeploy] = useState(false);

  // Load MCP spec for resource graph
  const configIO = useMemo(() => new ConfigIO(), []);
  const [mcpSpec, setMcpSpec] = useState<AgentCoreMcpSpec | undefined>();

  useEffect(() => {
    if (!context) return;
    if (configIO.configExists('mcp')) {
      configIO
        .readMcpSpec()
        .then(setMcpSpec)
        .catch(() => setMcpSpec(undefined));
    }
  }, [context, configIO]);

  // Wrap onExit to dispose the wrapper when not deploying
  const handleExit = useCallback(() => {
    if (!showDeploy) {
      void dispose();
    }
    onExit();
  }, [showDeploy, dispose, onExit]);

  // Auto-start preflight when AWS target is configured
  useEffect(() => {
    if (phase === 'idle' && awsConfig.isConfigured) {
      startPlan();
    }
  }, [phase, awsConfig.isConfigured, startPlan]);

  // Auto-confirm bootstrap when autoConfirm is enabled
  useEffect(() => {
    if (autoConfirm && phase === 'bootstrap-confirm') {
      confirmBootstrap();
    }
  }, [autoConfirm, phase, confirmBootstrap]);

  // Trigger token-expired recovery flow when plan fails with token error
  useEffect(() => {
    if (hasTokenExpiredError && awsConfig.phase !== 'token-expired') {
      awsConfig.triggerTokenExpired();
    }
  }, [hasTokenExpiredError, awsConfig]);

  // Trigger credentials recovery flow when plan fails with credentials error (interactive mode only)
  useEffect(() => {
    if (isInteractive && hasCredentialsError && awsConfig.phase !== 'choice') {
      awsConfig.triggerNoCredentials();
    }
  }, [isInteractive, hasCredentialsError, awsConfig]);

  // Exit in non-interactive mode when there's an error
  useEffect(() => {
    if (!isInteractive && hasError && phase === 'error') {
      handleExit();
    }
  }, [isInteractive, hasError, phase, handleExit]);

  // Show deploy screen when user chooses to deploy (only in interactive mode)
  if (showDeploy && cdkToolkitWrapper && context && isInteractive) {
    return (
      <DeployScreen
        isInteractive={true}
        onExit={onExit}
        preSynthesized={{ cdkToolkitWrapper, context, stackNames, switchableIoHost: switchableIoHost ?? undefined }}
      />
    );
  }

  // Token expired recovery flow - show re-authentication options
  if (awsConfig.phase === 'token-expired') {
    const handleShellCommand = (command: string) => {
      // Clear the error state before navigating to shell
      clearTokenExpiredError();
      awsConfig.resetFromTokenExpired();
      if (onShellCommand) {
        onShellCommand(command);
      }
    };

    return (
      <Screen title="AgentCore Plan" onExit={handleExit} helpText={getAwsConfigHelpText(awsConfig.phase)}>
        <AwsTargetConfigUI config={awsConfig} onShellCommand={handleShellCommand} onExit={handleExit} isActive={true} />
      </Screen>
    );
  }

  // Credentials error recovery flow - show credential setup options (interactive mode)
  if (awsConfig.phase === 'choice' && hasCredentialsError) {
    const handleShellCommand = (command: string) => {
      // Clear the error state before navigating to shell
      clearCredentialsError();
      awsConfig.resetFromChoice();
      if (onShellCommand) {
        onShellCommand(command);
      }
    };

    return (
      <Screen title="AgentCore Plan" onExit={handleExit} helpText={getAwsConfigHelpText(awsConfig.phase)}>
        <StepProgress steps={steps} />
        <Box marginTop={1}>
          <AwsTargetConfigUI
            config={awsConfig}
            onShellCommand={handleShellCommand}
            onExit={handleExit}
            isActive={true}
          />
        </Box>
      </Screen>
    );
  }

  // AWS target configuration phase
  if (!awsConfig.isConfigured) {
    const handleShellCommand = (command: string) => {
      if (onShellCommand) {
        onShellCommand(command);
      }
    };

    return (
      <Screen title="AgentCore Plan" onExit={handleExit} helpText={getAwsConfigHelpText(awsConfig.phase)}>
        <AwsTargetConfigUI config={awsConfig} onShellCommand={handleShellCommand} onExit={handleExit} isActive={true} />
      </Screen>
    );
  }

  // Bootstrap confirmation phase (only shown if not auto-confirming)
  if (phase === 'bootstrap-confirm' && !autoConfirm) {
    return (
      <ConfirmPrompt
        message={BOOTSTRAP.TITLE}
        detail={BOOTSTRAP.EXPLAINER}
        onConfirm={confirmBootstrap}
        onCancel={skipBootstrap}
      />
    );
  }

  const targetDisplay = context?.awsTargets.map(t => `${t.region}:${t.account}`).join(', ');

  const helpText = allSuccess && isInteractive ? HELP_TEXT.NAVIGATE_SELECT : HELP_TEXT.EXIT;

  const headerContent = context && (
    <Box flexDirection="column">
      <Box>
        <Text>Project: </Text>
        <Text color="green">{context.projectSpec.name}</Text>
      </Box>
      {targetDisplay && (
        <Box>
          <Text>Target: </Text>
          <Text color="yellow">{targetDisplay}</Text>
        </Box>
      )}
    </Box>
  );

  return (
    <Screen title="AgentCore Plan" onExit={handleExit} helpText={helpText} headerContent={headerContent}>
      <StepProgress steps={steps} />
      {allSuccess && synthOutput && (
        <Box marginTop={1}>
          <Text color="green">{synthOutput}</Text>
        </Box>
      )}
      {allSuccess && context && (
        <Box marginTop={1}>
          <ResourceGraph project={context.projectSpec} mcp={mcpSpec} />
        </Box>
      )}
      {allSuccess && cdkToolkitWrapper && context && (
        <NextSteps
          steps={PLAN_NEXT_STEPS}
          isInteractive={isInteractive}
          onSelect={step => {
            if (step.command === 'deploy') {
              setShowDeploy(true);
            }
          }}
          onBack={handleExit}
          isActive={allSuccess && !showDeploy}
        />
      )}
    </Screen>
  );
}
