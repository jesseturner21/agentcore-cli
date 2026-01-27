import { compareVersions, fetchLatestVersion } from '../../../commands/update';
import { PACKAGE_VERSION } from '../../../constants';
import { GradientText, Screen } from '../../components';
import { STATUS_COLORS } from '../../theme';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

interface UpdateScreenProps {
  isInteractive: boolean;
  onExit: () => void;
}

type Phase = 'checking' | 'up-to-date' | 'newer-local' | 'update-available' | 'updating' | 'updated' | 'error';

interface UpdateState {
  phase: Phase;
  currentVersion: string;
  latestVersion: string | null;
  error: string | null;
}

export function UpdateScreen({ isInteractive: _isInteractive, onExit }: UpdateScreenProps) {
  const [state, setState] = useState<UpdateState>({
    phase: 'checking',
    currentVersion: PACKAGE_VERSION,
    latestVersion: null,
    error: null,
  });

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const latestVersion = await fetchLatestVersion();
        const comparison = compareVersions(PACKAGE_VERSION, latestVersion);

        if (comparison === 0) {
          setState({
            phase: 'up-to-date',
            currentVersion: PACKAGE_VERSION,
            latestVersion,
            error: null,
          });
        } else if (comparison < 0) {
          setState({
            phase: 'newer-local',
            currentVersion: PACKAGE_VERSION,
            latestVersion,
            error: null,
          });
        } else {
          setState({
            phase: 'update-available',
            currentVersion: PACKAGE_VERSION,
            latestVersion,
            error: null,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: errorMsg,
        }));
      }
    };

    void checkForUpdates();
  }, []);

  const renderContent = () => {
    switch (state.phase) {
      case 'checking':
        return (
          <Box flexDirection="column" marginTop={1}>
            <GradientText text="Checking for updates..." />
          </Box>
        );

      case 'up-to-date':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text>Current version: </Text>
              <Text color={STATUS_COLORS.success}>{state.currentVersion}</Text>
            </Box>
            <Box>
              <Text>Latest version: </Text>
              <Text>{state.latestVersion}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={STATUS_COLORS.success}>You are on the latest version</Text>
            </Box>
          </Box>
        );

      case 'newer-local':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text>Current version: </Text>
              <Text color={STATUS_COLORS.warning}>{state.currentVersion}</Text>
            </Box>
            <Box>
              <Text>Latest version: </Text>
              <Text>{state.latestVersion}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={STATUS_COLORS.warning}>Your version is newer than the published version (dev build)</Text>
            </Box>
          </Box>
        );

      case 'update-available':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text>Current version: </Text>
              <Text>{state.currentVersion}</Text>
            </Box>
            <Box>
              <Text>Latest version: </Text>
              <Text color={STATUS_COLORS.success}>{state.latestVersion}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={STATUS_COLORS.info}>Update available!</Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Run </Text>
              <Text color={STATUS_COLORS.info}>agentcore update</Text>
              <Text dimColor> from the command line to install</Text>
            </Box>
          </Box>
        );

      case 'updating':
        return (
          <Box flexDirection="column" marginTop={1}>
            <GradientText text="Installing update..." />
          </Box>
        );

      case 'updated':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color={STATUS_COLORS.success}>Successfully updated to {state.latestVersion}</Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Restart agentcore to use the new version</Text>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={STATUS_COLORS.error}>Failed to check for updates</Text>
            {state.error && (
              <Text color={STATUS_COLORS.error} dimColor>
                {state.error}
              </Text>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Screen title="AgentCore Update" onExit={onExit}>
      {renderContent()}
    </Screen>
  );
}
