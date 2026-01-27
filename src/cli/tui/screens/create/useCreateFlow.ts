import { APP_DIR, CONFIG_DIR, ConfigIO, findConfigRoot, setEnvVar, setSessionProjectRoot } from '../../../../lib';
import type { AgentCoreCliMcpDefs, AgentCoreMcpSpec, AgentCoreProjectSpec, DeployedState } from '../../../../schema';
import { getErrorMessage } from '../../../errors';
import { initGitRepo, setupPythonProject, writeEnvFile, writeGitignore } from '../../../operations';
import { mapGenerateConfigToAgentEnvSpec, writeAgentToProject } from '../../../operations/agent/generate';
import { computeDefaultIdentityEnvVarName } from '../../../operations/identity/create-identity';
import { CDKRenderer, createRenderer } from '../../../templates';
import { type Step, areStepsComplete, hasStepError } from '../../components';
import { withMinDuration } from '../../utils';
import { useGenerateWizard } from '../generate/useGenerateWizard';
import { mkdir } from 'fs/promises';
import { basename, join } from 'path';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CreatePhase =
  | 'checking'
  | 'existing-project-error'
  | 'input'
  | 'create-prompt'
  | 'create-wizard'
  | 'running'
  | 'complete';

interface CreateFlowState {
  phase: CreatePhase;
  projectName: string;
  existingProjectPath?: string;
  steps: Step[];
  outputDir?: string;
  hasError: boolean;
  isComplete: boolean;
  // Project name actions
  setProjectName: (name: string) => void;
  confirmProjectName: () => void;
  // Create prompt actions
  wantsCreate: boolean;
  setWantsCreate: (wants: boolean) => void;
  // Create wizard (reused from useGenerateWizard)
  wizard: ReturnType<typeof useGenerateWizard>;
  goBackFromWizard: () => void;
  confirmCreate: () => void;
}

function getCreateSteps(projectName: string, wantsCreate: boolean, isPython: boolean): Step[] {
  const steps: Step[] = [{ label: `Create ${projectName}/ project directory`, status: 'pending' }];

  if (wantsCreate) {
    steps.push({ label: 'Add agent to project', status: 'pending' });
    if (isPython) {
      steps.push({ label: 'Set up Python environment', status: 'pending' });
    }
  }

  steps.push({ label: 'Prepare agentcore/ directory', status: 'pending' });
  steps.push({ label: 'Initialize git repository', status: 'pending' });

  return steps;
}

function createDefaultProjectSpec(projectName: string): AgentCoreProjectSpec {
  return {
    name: projectName,
    version: '0.1',
    description: `AgentCore project: ${projectName}`,
    agents: [],
  };
}

function createDefaultDeployedState(): DeployedState {
  return {
    targets: {},
  };
}

function createDefaultMcpSpec(): AgentCoreMcpSpec {
  return {
    agentCoreGateways: [],
    mcpRuntimeTools: [],
  };
}

function createDefaultMcpDefs(): AgentCoreCliMcpDefs {
  return {
    tools: {},
  };
}

/**
 * Convert directory name to valid project name.
 * Removes invalid characters and ensures it starts with a letter.
 */
function sanitizeProjectName(dirName: string): string {
  // Remove non-alphanumeric characters and capitalize words
  let name = dirName
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(name)) {
    name = 'Project' + name;
  }

  // Truncate to 36 chars
  return name.slice(0, 36) || 'Project';
}

export function useCreateFlow(cwd: string): CreateFlowState {
  const [phase, setPhase] = useState<CreatePhase>('checking');
  const defaultProjectName = useMemo(() => sanitizeProjectName(basename(cwd)), [cwd]);
  const [projectName, setProjectName] = useState(defaultProjectName);
  const [existingProjectPath, setExistingProjectPath] = useState<string | undefined>();
  const [steps, setSteps] = useState<Step[]>([]);
  const [outputDir, setOutputDir] = useState<string>();

  // Create prompt state
  const [wantsCreate, setWantsCreate] = useState(false);

  // Reuse the generate wizard hook
  const wizard = useGenerateWizard();

  // Check for existing project on mount (walk up directory tree)
  useEffect(() => {
    if (phase !== 'checking') return;

    const checkExisting = () => {
      // Use findConfigRoot to walk up the directory tree looking for agentcore/
      const existingConfig = findConfigRoot(cwd);
      if (existingConfig) {
        // Found an existing project - error out
        setExistingProjectPath(existingConfig);
        setPhase('existing-project-error');
      } else {
        // No existing project found - proceed to input
        setPhase('input');
      }
    };

    void checkExisting();
  }, [cwd, phase]);

  const confirmProjectName = useCallback(() => {
    setPhase('create-prompt');
  }, []);

  const updateStep = (index: number, update: Partial<Step>) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  };

  // Create prompt handlers
  const handleSetWantsCreate = useCallback(
    (wants: boolean) => {
      setWantsCreate(wants);
      if (wants) {
        wizard.reset(); // Reset wizard state when entering
        setPhase('create-wizard');
      } else {
        // Skip create wizard, go straight to running
        setSteps(getCreateSteps(projectName, false, false));
        setPhase('running');
      }
    },
    [wizard, projectName]
  );

  // Go back from wizard to create prompt
  const goBackFromWizard = useCallback(() => {
    if (wizard.currentIndex === 0) {
      setPhase('create-prompt');
    } else {
      wizard.goBack();
    }
  }, [wizard]);

  // Confirm create wizard and start running
  const confirmCreate = useCallback(() => {
    const isPython = wizard.config.language === 'Python';
    setSteps(getCreateSteps(projectName, true, isPython));
    setPhase('running');
  }, [wizard.config.language, projectName]);

  // Main running effect
  useEffect(() => {
    if (phase !== 'running') return;

    const run = async () => {
      // Project root is now cwd/projectName (creating a new directory)
      const projectRoot = join(cwd, projectName);
      const configBaseDir = join(projectRoot, CONFIG_DIR);
      const generateConfig = wizard.config;
      let stepIndex = 0;

      try {
        // Step: Create project directory and config files
        updateStep(stepIndex, { status: 'running' });
        try {
          await withMinDuration(async () => {
            // Create the top-level project directory
            await mkdir(projectRoot, { recursive: true });

            const configIO = new ConfigIO({ baseDir: configBaseDir });
            await configIO.initializeBaseDir();

            // Set session project so subsequent operations find this project
            setSessionProjectRoot(projectRoot);

            // Create .gitignore inside agentcore/
            await writeGitignore(configBaseDir);

            // Create empty .env file for secrets
            await writeEnvFile(configBaseDir);

            // Create agentcore.json
            const projectSpec = createDefaultProjectSpec(projectName);
            await configIO.writeProjectSpec(projectSpec);

            // Create empty aws-targets.json (will be populated by deploy/plan)
            await configIO.writeAWSDeploymentTargets([]);

            // Create deployed-state.json
            const deployedState = createDefaultDeployedState();
            await configIO.writeDeployedState(deployedState);

            // Create mcp.json
            const mcpSpec = createDefaultMcpSpec();
            await configIO.writeMcpSpec(mcpSpec);

            // Create mcp-defs.json
            const mcpDefs = createDefaultMcpDefs();
            await configIO.writeMcpDefs(mcpDefs);
          });
          updateStep(stepIndex, { status: 'success' });
          stepIndex++;
        } catch (err) {
          updateStep(stepIndex, { status: 'error', error: getErrorMessage(err) });
          return;
        }

        // Step: Generate agent files (if wantsCreate)
        if (wantsCreate) {
          updateStep(stepIndex, { status: 'running' });
          try {
            await withMinDuration(async () => {
              const agentSpec = mapGenerateConfigToAgentEnvSpec(generateConfig);
              const renderer = createRenderer(agentSpec);
              await renderer.render({ outputDir: projectRoot });
              await writeAgentToProject(generateConfig, { configBaseDir });

              // Write API key to agentcore/.env for non-Bedrock providers
              if (generateConfig.apiKey && generateConfig.modelProvider !== 'Bedrock') {
                const envVarName = computeDefaultIdentityEnvVarName(generateConfig.modelProvider);
                await setEnvVar(envVarName, generateConfig.apiKey, configBaseDir);
              }
            });
            updateStep(stepIndex, { status: 'success' });
            stepIndex++;
          } catch (err) {
            updateStep(stepIndex, { status: 'error', error: getErrorMessage(err) });
            return;
          }

          // Step: Set up Python environment (if Python)
          if (generateConfig.language === 'Python') {
            updateStep(stepIndex, { status: 'running' });
            // Agent is in app/<agentName>/ directory
            const agentDir = join(projectRoot, APP_DIR, generateConfig.projectName);
            const result = await setupPythonProject({ projectDir: agentDir });

            if (result.status === 'success') {
              updateStep(stepIndex, { status: 'success' });
            } else {
              updateStep(stepIndex, {
                status: 'warn',
                warn: 'Failed to set up Python environment. Run "uv sync" manually to see the error.',
              });
            }
            stepIndex++;
          }
        }

        // Step: Create CDK project
        updateStep(stepIndex, { status: 'running' });
        try {
          const renderer = new CDKRenderer();
          const cdkDir = await withMinDuration(() => renderer.render({ projectRoot }));
          setOutputDir(cdkDir);
          updateStep(stepIndex, { status: 'success' });
          stepIndex++;
        } catch (err) {
          updateStep(stepIndex, { status: 'error', error: getErrorMessage(err) });
          return;
        }

        // Step: Initialize git repository
        updateStep(stepIndex, { status: 'running' });
        const gitResult = await initGitRepo(projectRoot);
        if (gitResult.status === 'error') {
          updateStep(stepIndex, { status: 'error', error: gitResult.message });
          return;
        } else if (gitResult.status === 'skipped') {
          updateStep(stepIndex, { status: 'success', warn: gitResult.message });
        } else {
          updateStep(stepIndex, { status: 'success' });
        }

        setPhase('complete');
      } catch (err) {
        // Top-level catch - find current running step and mark as error
        setSteps(prev => {
          const runningIndex = prev.findIndex(s => s.status === 'running');
          if (runningIndex >= 0) {
            return prev.map((s, i) =>
              i === runningIndex ? { ...s, status: 'error' as const, error: getErrorMessage(err) } : s
            );
          }
          return prev;
        });
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const hasError = hasStepError(steps);
  const isComplete = areStepsComplete(steps);

  return {
    phase,
    projectName,
    existingProjectPath,
    steps,
    outputDir,
    hasError,
    isComplete,
    setProjectName,
    confirmProjectName,
    // Create prompt
    wantsCreate,
    setWantsCreate: handleSetWantsCreate,
    // Create wizard
    wizard,
    goBackFromWizard,
    confirmCreate,
  };
}
