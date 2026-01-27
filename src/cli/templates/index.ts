import type { AgentEnvSpec } from '../../schema';
import { AutoGenRenderer } from './AutoGenRenderer';
import type { BaseRenderer } from './BaseRenderer';
import { CrewAIRenderer } from './CrewAIRenderer';
import { GoogleADKRenderer } from './GoogleADKRenderer';
import { LangGraphRenderer } from './LangGraphRenderer';
import { OpenAIAgentsRenderer } from './OpenAIAgentsRenderer';
import { StrandsRenderer } from './StrandsRenderer';

export { BaseRenderer, type RendererContext } from './BaseRenderer';
export { CDKRenderer, type CDKRendererContext } from './CDKRenderer';
export { renderMcpToolTemplate } from './McpToolRenderer';
export { AutoGenRenderer } from './AutoGenRenderer';
export { CrewAIRenderer } from './CrewAIRenderer';
export { GoogleADKRenderer } from './GoogleADKRenderer';
export { LangGraphRenderer } from './LangGraphRenderer';
export { OpenAIAgentsRenderer } from './OpenAIAgentsRenderer';
export { StrandsRenderer } from './StrandsRenderer';

/**
 * Factory function to create the appropriate renderer based on agent spec
 */
export function createRenderer(agentSpec: AgentEnvSpec): BaseRenderer {
  switch (agentSpec.sdkFramework) {
    case 'Strands':
      return new StrandsRenderer(agentSpec);
    case 'AutoGen':
      return new AutoGenRenderer(agentSpec);
    case 'CrewAI':
      return new CrewAIRenderer(agentSpec);
    case 'GoogleADK':
      return new GoogleADKRenderer(agentSpec);
    case 'LangChain_LangGraph':
      return new LangGraphRenderer(agentSpec);
    case 'OpenAIAgents':
      return new OpenAIAgentsRenderer(agentSpec);
    default: {
      const _exhaustive: never = agentSpec.sdkFramework;
      throw new Error(`Unsupported SDK framework: ${String(_exhaustive)}`);
    }
  }
}
