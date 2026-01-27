import { APP_DIR } from '../../lib';
import type { AgentEnvSpec } from '../../schema';
import { copyAndRenderDir } from './render';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

export interface RendererContext {
  outputDir: string;
}

type TemplateData = AgentEnvSpec &
  RendererContext & {
    projectName: string;
    Name: string;
    hasMemory: boolean;
    hasIdentity: boolean;
    hasMcp: boolean;
  };

export abstract class BaseRenderer {
  protected readonly agentSpec: AgentEnvSpec;
  protected readonly sdkName: string;
  protected readonly baseTemplateDir: string;

  protected constructor(agentSpec: AgentEnvSpec, sdkName: string, baseTemplateDir: string) {
    this.agentSpec = agentSpec;
    this.sdkName = sdkName;
    this.baseTemplateDir = baseTemplateDir;
  }

  protected getTemplateDir(): string {
    const language = this.agentSpec.targetLanguage.toLowerCase();
    return path.join(this.baseTemplateDir, language, this.sdkName);
  }

  async render(context: RendererContext): Promise<void> {
    const templateDir = this.getTemplateDir();
    const projectName = this.agentSpec.name;
    // Agents are placed in app/<agentName>/ directory
    const projectDir = path.join(context.outputDir, APP_DIR, projectName);
    const hasMemory = this.agentSpec.memoryProviders.length > 0;
    const hasIdentity = this.agentSpec.identityProviders.length > 0;
    const hasMcp = this.agentSpec.mcpProviders.length > 0;

    const templateData: TemplateData = {
      ...this.agentSpec,
      ...context,
      projectName,
      Name: projectName,
      hasMemory,
      hasIdentity,
      hasMcp,
    };

    // Always render base template
    const baseDir = path.join(templateDir, 'base');
    await copyAndRenderDir(baseDir, projectDir, templateData);

    // Render capability templates based on agent spec
    // Only render if the capability directory exists (not all SDKs have all capabilities)
    if (hasMemory) {
      const memoryCapabilityDir = path.join(templateDir, 'capabilities', 'memory');
      if (existsSync(memoryCapabilityDir)) {
        const memoryTargetDir = path.join(projectDir, 'memory');
        await copyAndRenderDir(memoryCapabilityDir, memoryTargetDir, templateData);
      }
    }
  }
}
