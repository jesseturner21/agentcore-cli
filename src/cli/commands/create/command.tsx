import { getWorkingDirectory } from '../../../lib';
import { getErrorMessage } from '../../errors';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { CreateScreen } from '../../tui/screens/create';
import type { Command } from '@commander-js/extra-typings';
import { Text, render } from 'ink';

function handleCreate(): void {
  const cwd = getWorkingDirectory();
  const { unmount } = render(<CreateScreen cwd={cwd} isInteractive={false} onExit={() => unmount()} />);
}

export const registerCreate = (program: Command) => {
  program
    .command('create')
    .description(COMMAND_DESCRIPTIONS.create)
    .action(_ => {
      try {
        handleCreate();
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });
};
