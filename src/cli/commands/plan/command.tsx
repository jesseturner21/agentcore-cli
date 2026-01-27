import { getErrorMessage } from '../../errors';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import { PlanScreen } from '../../tui/screens/plan/PlanScreen';
import type { Command } from '@commander-js/extra-typings';
import { Text, render } from 'ink';

interface PlanOptions {
  autoConfirm?: boolean;
}

function handlePlan(options: PlanOptions = {}): void {
  requireProject();

  const { unmount } = render(
    <PlanScreen
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
          console.log('\nSet your AWS credentials and re-run `agentcore plan`\n');
        }
        process.exit(0);
      }}
    />
  );
}

export const registerPlan = (program: Command) => {
  program
    .command('plan')
    .description(COMMAND_DESCRIPTIONS.plan)
    .option('-y, --yes', 'Auto-confirm prompts (e.g., bootstrap)')
    .action((cliOptions: { yes?: boolean }) => {
      try {
        handlePlan({
          autoConfirm: cliOptions.yes,
        });
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });
};
