import { getWorkingDirectory } from '../../../lib';
import { loadProjectConfig } from '../../operations/dev/config';
import { FatalError } from '../../tui/components';
import { LayoutProvider } from '../../tui/context';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import type { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import React from 'react';

// Alternate screen buffer - same as main TUI
const ENTER_ALT_SCREEN = '\x1B[?1049h\x1B[H';
const EXIT_ALT_SCREEN = '\x1B[?1049l';
const SHOW_CURSOR = '\x1B[?25h';

export const registerDev = (program: Command) => {
  program
    .command('dev')
    .alias('d')
    .description(COMMAND_DESCRIPTIONS.dev)
    .option('-p, --port <port>', 'Port for development server', '8080')
    .action(async opts => {
      const workingDir = getWorkingDirectory();
      const project = await loadProjectConfig(workingDir);

      if (!project) {
        render(<FatalError message="No agentcore project found." suggestedCommand="agentcore create" />);
        process.exit(1);
      }

      if (!project.agents || project.agents.length === 0) {
        render(<FatalError message="No agents defined in project." suggestedCommand="agentcore create" />);
        process.exit(1);
      }

      // Enter alternate screen buffer for fullscreen mode
      process.stdout.write(ENTER_ALT_SCREEN);

      const exitAltScreen = () => {
        process.stdout.write(EXIT_ALT_SCREEN);
        process.stdout.write(SHOW_CURSOR);
      };

      const { DevScreen } = await import('../../tui/screens/dev/DevScreen');
      const { unmount, waitUntilExit } = render(
        <LayoutProvider>
          <DevScreen
            isInteractive={false}
            onBack={() => {
              exitAltScreen();
              unmount();
              process.exit(0);
            }}
            workingDir={workingDir}
            port={parseInt(opts.port, 10)}
          />
        </LayoutProvider>
      );

      await waitUntilExit();
      exitAltScreen();
    });
};
