import { getErrorMessage } from '../../errors';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import { handleStatus, handleStatusAll, loadStatusConfig } from './action';
import type { Command } from '@commander-js/extra-typings';
import { Box, Text, render } from 'ink';

export const registerStatus = (program: Command) => {
  program
    .command('status')
    .alias('s')
    .description(COMMAND_DESCRIPTIONS.status)
    .option('--agent <name>', 'Select specific agent')
    .option('--agent-runtime-id <id>', 'Select specific agent runtime ID')
    .option('--target <name>', 'Select deployment target')
    .action(async (cliOptions: { agent?: string; agentRuntimeId?: string; target?: string }) => {
      requireProject();

      try {
        const context = await loadStatusConfig();
        if (!cliOptions.agent && !cliOptions.agentRuntimeId) {
          const summary = await handleStatusAll(context, {
            targetName: cliOptions.target,
          });

          if (!summary.success || !summary.entries) {
            render(<Text color="red">{summary.error}</Text>);
            return;
          }

          render(
            <Box flexDirection="column">
              <Text>AgentCore Status (target: {summary.targetName})</Text>
              {summary.entries.map(entry => {
                const deploymentStatus = entry.isDeployed ? 'Deployed' : 'Not deployed';
                const runtimeStatus = entry.runtimeStatus ? `Runtime status: ${entry.runtimeStatus}` : undefined;
                const runtimeError = entry.error ? `Runtime error: ${entry.error}` : undefined;
                const details = [deploymentStatus, runtimeStatus, runtimeError].filter(Boolean).join(' - ');
                return (
                  <Text key={entry.agentName}>
                    {entry.agentName}: {details}
                  </Text>
                );
              })}
            </Box>
          );

          return;
        }

        const result = await handleStatus(context, {
          agentName: cliOptions.agent,
          agentRuntimeId: cliOptions.agentRuntimeId,
          targetName: cliOptions.target,
        });

        if (!result.success) {
          render(<Text color="red">{result.error}</Text>);
          return;
        }

        const subject = result.agentName ?? result.runtimeId ?? 'Agent';

        function getDeploymentStatus(isDeployed: boolean | undefined): string | undefined {
          if (isDeployed === undefined) return undefined;
          return isDeployed ? 'Deployed' : 'Not deployed';
        }

        const deploymentStatus = getDeploymentStatus(result.isDeployed);
        const runtimeStatus = result.runtimeStatus ? `Runtime status: ${result.runtimeStatus}` : undefined;
        const details = [deploymentStatus, runtimeStatus].filter(Boolean).join(' - ');

        render(
          <Text>
            AgentCore Status - {subject} (target: {result.targetName}){details ? ` - ${details}` : ''}
          </Text>
        );
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });
};
