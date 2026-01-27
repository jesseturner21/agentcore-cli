import { ConfigIO } from '../../../lib';
import { getErrorMessage } from '../../errors';
import { ResourceGraph } from '../../tui/components/ResourceGraph';
import { COMMAND_DESCRIPTIONS } from '../../tui/copy';
import { requireProject } from '../../tui/guards';
import type { Command } from '@commander-js/extra-typings';
import { Text, render } from 'ink';

export const registerOutline = (program: Command) => {
  const outline = program
    .command('outline')
    .description(COMMAND_DESCRIPTIONS.outline)
    .action(async () => {
      requireProject();

      try {
        const configIO = new ConfigIO();
        const projectSpec = await configIO.readProjectSpec();

        render(<ResourceGraph project={projectSpec} mcp={projectSpec.mcp} />);
        process.exit(0);
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });

  outline
    .command('agent')
    .description('Display resource tree for a specific agent')
    .argument('<name>', 'Agent name')
    .action(async (name: string) => {
      requireProject();

      try {
        const configIO = new ConfigIO();
        const projectSpec = await configIO.readProjectSpec();

        const agentExists = projectSpec.agents?.some(a => a.name === name);
        if (!agentExists) {
          render(<Text color="red">Agent &quot;{name}&quot; not found</Text>);
          process.exit(1);
        }

        render(<ResourceGraph project={projectSpec} mcp={projectSpec.mcp} agentName={name} />);
        process.exit(0);
      } catch (error) {
        render(<Text color="red">Error: {getErrorMessage(error)}</Text>);
        process.exit(1);
      }
    });
};
