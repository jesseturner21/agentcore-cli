import type { AgentEnvSpec } from '../../schema';
import { BaseRenderer } from './BaseRenderer';
import { TEMPLATE_ROOT } from './templateRoot';

export class AutoGenRenderer extends BaseRenderer {
  constructor(agentSpec: AgentEnvSpec) {
    super(agentSpec, 'autogen', TEMPLATE_ROOT);
  }
}
