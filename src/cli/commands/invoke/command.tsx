import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import { InvokeScreen } from '../../tui/screens/invoke';
import type { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import React from 'react';

export const registerInvoke = (program: Command) => {
  program
    .command('invoke')
    .alias('i')
    .description(COMMAND_DESCRIPTIONS.invoke)
    .argument('[prompt]', 'Prompt to send to the agent')
    .option('--agent <name>', 'Select specific agent')
    .option('--target <name>', 'Select deployment target')
    .action(async (prompt: string | undefined, _cliOptions: { agent?: string; target?: string }) => {
      requireProject();

      const { waitUntilExit } = render(
        <InvokeScreen isInteractive={false} onExit={() => process.exit(0)} initialPrompt={prompt} />
      );
      await waitUntilExit();
    });
};
