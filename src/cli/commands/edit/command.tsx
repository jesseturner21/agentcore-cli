import { getErrorMessage } from '../../errors';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import type { Command } from '@commander-js/extra-typings';
import { Text, render } from 'ink';

export const registerEdit = (program: Command) => {
  program
    .command('edit')
    .alias('e')
    .description(COMMAND_DESCRIPTIONS.edit)
    .action(async () => {
      try {
        requireProject();

        const { EditSchemaScreen } = await import('../../tui/screens/schema/EditSchemaScreen');
        const { clear, unmount } = render(
          <EditSchemaScreen
            isInteractive={false}
            onExit={() => {
              clear();
              unmount();
              process.exit(0);
            }}
          />
        );
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });
};
