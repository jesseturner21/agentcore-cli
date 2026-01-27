import { CONFIG_DIR, runSubprocess } from '../../lib';
import { CDK_PROJECT_DIR, getDistroConfig } from '../constants';
import { copyDir } from './render';
import { LLM_CONTEXT_FILES } from './schema-assets';
import { getTemplatePath } from './templateRoot';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const LLM_CONTEXT_DIR = '.llm-context';

export interface CDKRendererContext {
  /**
   * The project root directory (e.g., /projects/MyApp).
   * The CDK project will be created at <projectRoot>/agentcore/cdk/
   */
  projectRoot: string;
}

/**
 * Renders the CDK project template to the specified project.
 * Creates the CDK project at <projectRoot>/agentcore/cdk/.
 *
 * Also writes:
 * - AGENTS.md to <projectRoot>/ for AI coding assistant context
 * - .llm-context/ directory with LLM-compacted schema files
 */
export class CDKRenderer {
  private readonly templateDir: string;
  private readonly agentsTemplateDir: string;

  constructor() {
    this.templateDir = getTemplatePath('cdk');
    this.agentsTemplateDir = getTemplatePath('agents');
  }

  async render(context: CDKRendererContext): Promise<string> {
    const configDir = path.join(context.projectRoot, CONFIG_DIR); // agentcore/ directory
    const outputDir = path.join(configDir, CDK_PROJECT_DIR);

    // Copy CDK project template
    await copyDir(this.templateDir, outputDir);

    // Update package.json with distro-specific configuration
    await this.updatePackageJson(outputDir);

    // Copy AGENTS.md template to project root
    await this.copyAgentsTemplate(context.projectRoot);

    // Write LLM context files to agentcore/.llm-context/
    await this.writeLlmContext(configDir);

    // Install CDK project dependencies (postinstall script will link agentcore)
    await runSubprocess('npm', ['install', '--silent'], { cwd: outputDir, stdio: 'pipe' });

    // Format the CDK project files
    await runSubprocess('npm', ['run', 'format'], { cwd: outputDir, stdio: 'pipe' });

    return outputDir;
  }

  private async copyAgentsTemplate(projectRoot: string): Promise<void> {
    const agentsMdSrc = path.join(this.agentsTemplateDir, 'AGENTS.md');
    const agentsMdDest = path.join(projectRoot, 'AGENTS.md');
    await fs.copyFile(agentsMdSrc, agentsMdDest);
  }

  private async writeLlmContext(configDir: string): Promise<void> {
    const llmContextDir = path.join(configDir, LLM_CONTEXT_DIR);
    await fs.mkdir(llmContextDir, { recursive: true });

    for (const [filename, content] of Object.entries(LLM_CONTEXT_FILES)) {
      await fs.writeFile(path.join(llmContextDir, filename), content, 'utf-8');
    }
  }

  /**
   * Updates the generated package.json with distro-specific configuration.
   * Adjusts the postinstall script to link the correct package name.
   */
  private async updatePackageJson(outputDir: string): Promise<void> {
    const packageJsonPath = path.join(outputDir, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content) as {
      scripts?: { postinstall?: string };
      [key: string]: unknown;
    };

    const distroConfig = getDistroConfig();
    const cdkPackageName = distroConfig.cdkPackageName;

    // Update postinstall script to use the correct CDK package name
    if (pkg.scripts?.postinstall) {
      pkg.scripts.postinstall = `npm link ${cdkPackageName} 2>/dev/null || echo 'Note: If CDK synth fails, run: npm link ${cdkPackageName}'`;
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }
}
