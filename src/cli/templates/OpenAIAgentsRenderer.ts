import type { AgentEnvSpec } from '../../schema';
import { BaseRenderer } from './BaseRenderer';
import { TEMPLATE_ROOT } from './templateRoot';

export class OpenAIAgentsRenderer extends BaseRenderer {
  constructor(agentSpec: AgentEnvSpec) {
    super(agentSpec, 'openaiagents', TEMPLATE_ROOT);
  }
}
