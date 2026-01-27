import type { AgentEnvSpec } from '../../schema';
import { BaseRenderer } from './BaseRenderer';
import { TEMPLATE_ROOT } from './templateRoot';

export class LangGraphRenderer extends BaseRenderer {
  constructor(agentSpec: AgentEnvSpec) {
    super(agentSpec, 'langchain_langgraph', TEMPLATE_ROOT);
  }
}
