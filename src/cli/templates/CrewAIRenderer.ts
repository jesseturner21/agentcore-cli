import type { AgentEnvSpec } from '../../schema';
import { BaseRenderer } from './BaseRenderer';
import { TEMPLATE_ROOT } from './templateRoot';

export class CrewAIRenderer extends BaseRenderer {
  constructor(agentSpec: AgentEnvSpec) {
    super(agentSpec, 'crewai', TEMPLATE_ROOT);
  }
}
