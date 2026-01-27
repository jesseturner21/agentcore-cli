import { getErrorMessage } from '../../errors';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import { DeployScreen } from '../../tui/screens/deploy/DeployScreen';
import type { Command } from '@commander-js/extra-typings';
import { Text, render } from 'ink';

interface DeployOptions {
  autoConfirm?: boolean;
}

function handleDeploy(options: DeployOptions = {}): void {
  requireProject();

  const { unmount } = render(
    <DeployScreen
      isInteractive={false}
      autoConfirm={options.autoConfirm}
      onExit={() => {
        unmount();
        process.exit(0);
      }}
      onShellCommand={command => {
        unmount();
        if (command) {
          console.log(`\nRun: ${command}\n`);
        } else {
          console.log('\nSet your AWS credentials and re-run `agentcore deploy`\n');
        }
        process.exit(0);
      }}
    />
  );
}

export const registerDeploy = (program: Command) => {
  program
    .command('deploy')
    .alias('p')
    .description(COMMAND_DESCRIPTIONS.deploy)
    .option('-y, --yes', 'Auto-confirm prompts (e.g., bootstrap)')
    .action((cliOptions: { yes?: boolean }) => {
      try {
        handleDeploy({
          autoConfirm: cliOptions.yes,
        });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });
};
