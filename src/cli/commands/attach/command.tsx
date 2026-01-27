import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import { AttachFlow } from '../../tui/screens/attach/AttachFlow';
import type { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import React from 'react';

export function registerAttach(program: Command) {
  program
    .command('attach')
    .description(COMMAND_DESCRIPTIONS.attach)
    .action(() => {
      requireProject();

      const { clear, unmount } = render(
        <AttachFlow
          onExit={() => {
            clear();
            unmount();
          }}
        />
      );
    });
}
