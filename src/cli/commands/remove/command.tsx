import { getErrorMessage } from '../../errors';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import { RemoveAllScreen, RemoveFlow } from '../../tui/screens/remove';
import type { Command } from '@commander-js/extra-typings';
import { Text, render } from 'ink';
import React from 'react';

interface RemoveOptions {
  force?: boolean;
  dryRun?: boolean;
}

function handleRemoveAll(options: RemoveOptions = {}): void {
  const { unmount } = render(
    <RemoveAllScreen
      isInteractive={false}
      force={options.force}
      dryRun={options.dryRun}
      onExit={() => {
        unmount();
        process.exit(0);
      }}
    />
  );
}

function handleRemoveResource(
  resourceType: 'agent' | 'gateway' | 'mcp-tool' | 'memory' | 'identity' | 'target',
  options: { force?: boolean }
): void {
  const { clear, unmount } = render(
    <RemoveFlow
      isInteractive={false}
      force={options.force}
      initialResourceType={resourceType}
      onExit={() => {
        clear();
        unmount();
        process.exit(0);
      }}
    />
  );
}

export const registerRemove = (program: Command) => {
  const removeCommand = program
    .command('remove')
    .description(COMMAND_DESCRIPTIONS.remove)
    .action(() => {
      // Show help when remove is called without subcommands
      removeCommand.help();
    });

  removeCommand
    .command('all')
    .description('Reset all agentcore schemas to empty state')
    .option('--force', 'Skip confirmation prompts')
    .option('--dry-run', 'Show what would be reset without actually resetting')
    .action((cliOptions: { force?: boolean; dryRun?: boolean }) => {
      try {
        handleRemoveAll({
          force: cliOptions.force,
          dryRun: cliOptions.dryRun,
        });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });

  removeCommand
    .command('agent')
    .description('Remove an agent from the project')
    .option('--force', 'Skip confirmation prompt')
    .action((cliOptions: { force?: boolean }) => {
      try {
        requireProject();
        handleRemoveResource('agent', { force: cliOptions.force });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });

  removeCommand
    .command('gateway')
    .description('Remove a gateway from the project')
    .option('--force', 'Skip confirmation prompt')
    .action((cliOptions: { force?: boolean }) => {
      try {
        requireProject();
        handleRemoveResource('gateway', { force: cliOptions.force });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });

  removeCommand
    .command('tool')
    .description('Remove an MCP tool from the project')
    .option('--force', 'Skip confirmation prompt')
    .action((cliOptions: { force?: boolean }) => {
      try {
        requireProject();
        handleRemoveResource('mcp-tool', { force: cliOptions.force });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });

  removeCommand
    .command('memory')
    .description('Remove a memory provider from the project')
    .option('--force', 'Skip confirmation prompt')
    .action((cliOptions: { force?: boolean }) => {
      try {
        requireProject();
        handleRemoveResource('memory', { force: cliOptions.force });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });

  removeCommand
    .command('identity')
    .description('Remove an identity provider from the project')
    .option('--force', 'Skip confirmation prompt')
    .action((cliOptions: { force?: boolean }) => {
      try {
        requireProject();
        handleRemoveResource('identity', { force: cliOptions.force });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });

  removeCommand
    .command('target')
    .description('Remove a deployment target from the project')
    .option('--force', 'Skip confirmation prompt')
    .action((cliOptions: { force?: boolean }) => {
      try {
        requireProject();
        handleRemoveResource('target', { force: cliOptions.force });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });
};
