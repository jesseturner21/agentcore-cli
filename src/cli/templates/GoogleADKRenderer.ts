import type { AgentEnvSpec } from '../../schema';
import { BaseRenderer } from './BaseRenderer';
import { TEMPLATE_ROOT } from './templateRoot';

export class GoogleADKRenderer extends BaseRenderer {
  constructor(agentSpec: AgentEnvSpec) {
    super(agentSpec, 'googleadk', TEMPLATE_ROOT);
  }
}
