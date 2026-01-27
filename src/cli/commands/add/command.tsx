import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import { AddFlow } from '../../tui/screens/add/AddFlow';
import type { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import React from 'react';

export function registerAdd(program: Command) {
  program
    .command('add')
    .description(COMMAND_DESCRIPTIONS.add)
    .action(() => {
      requireProject();

      const { clear, unmount } = render(
        <AddFlow
          isInteractive={false}
          onExit={() => {
            clear();
            unmount();
          }}
        />
      );
    });
}
