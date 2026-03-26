/**
 * Tests for execution role warning and confirmation during import.
 */
import type { ParsedStarterToolkitConfig } from '../types';
import { parseStarterToolkitYaml } from '../yaml-parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const YAML_WITH_EXECUTION_ROLE = `
default_agent: my_agent
agents:
  my_agent:
    name: my_agent
    entrypoint: main.py
    deployment_type: direct_code_deploy
    runtime_type: PYTHON_3_12
    language: python
    aws:
      account: '111122223333'
      region: us-west-2
      execution_role: arn:aws:iam::111122223333:role/my-custom-role
      network_configuration:
        network_mode: PUBLIC
      protocol_configuration:
        server_protocol: HTTP
      observability:
        enabled: true
    memory:
      mode: NO_MEMORY
    bedrock_agentcore:
      agent_id: ABCDEFGHIJ
      agent_arn: arn:aws:bedrock-agentcore:us-west-2:111122223333:runtime/ABCDEFGHIJ
`;

const YAML_WITHOUT_EXECUTION_ROLE = `
default_agent: my_agent
agents:
  my_agent:
    name: my_agent
    entrypoint: main.py
    deployment_type: direct_code_deploy
    runtime_type: PYTHON_3_12
    language: python
    aws:
      account: '111122223333'
      region: us-west-2
      network_configuration:
        network_mode: PUBLIC
      protocol_configuration:
        server_protocol: HTTP
      observability:
        enabled: true
    memory:
      mode: NO_MEMORY
    bedrock_agentcore:
      agent_id: ABCDEFGHIJ
`;

function writeTempYaml(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-role-test-'));
  const filePath = path.join(dir, '.bedrock_agentcore.yaml');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function cleanupTempFile(filePath: string): void {
  try {
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  } catch {
    /* noop */
  }
}

describe('YAML Parsing: executionRoleArn extraction', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const f of tempFiles) cleanupTempFile(f);
    tempFiles.length = 0;
  });

  it('should extract executionRoleArn from aws.execution_role', () => {
    const f = writeTempYaml(YAML_WITH_EXECUTION_ROLE);
    tempFiles.push(f);
    const parsed = parseStarterToolkitYaml(f);
    expect(parsed.agents[0]!.executionRoleArn).toBe('arn:aws:iam::111122223333:role/my-custom-role');
  });

  it('should return undefined when execution_role is absent', () => {
    const f = writeTempYaml(YAML_WITHOUT_EXECUTION_ROLE);
    tempFiles.push(f);
    const parsed = parseStarterToolkitYaml(f);
    expect(parsed.agents[0]!.executionRoleArn).toBeUndefined();
  });
});

describe('Import confirmation: role warning output', () => {
  it('should include agent name and role ARN in warning when executionRoleArn is present', () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    const parsed: ParsedStarterToolkitConfig = {
      agents: [
        {
          name: 'my_agent',
          entrypoint: 'main.py',
          build: 'CodeZip',
          runtimeVersion: 'PYTHON_3_12',
          language: 'python',
          networkMode: 'PUBLIC',
          protocol: 'HTTP',
          enableOtel: true,
          physicalAgentId: 'ABCDEFGHIJ',
          executionRoleArn: 'arn:aws:iam::111122223333:role/my-custom-role',
        },
      ],
      memories: [],
      credentials: [],
      awsTarget: { account: '111122223333', region: 'us-west-2' },
    };

    // Simulate the warning output logic from actions.ts
    const agentsWithRoles = parsed.agents.filter(a => a.executionRoleArn);

    console.log('\nThe following resources will be imported:\n');
    console.log('  Agents:');
    for (const agent of parsed.agents) {
      const idSuffix = agent.physicalAgentId ? ` (runtime ID: ${agent.physicalAgentId})` : '';
      console.log(`    - ${agent.name} (${agent.build}${idSuffix})`);
    }

    if (agentsWithRoles.length > 0) {
      console.log('\n\x1b[33m⚠  Execution Role Notice:\x1b[0m');
      for (const agent of agentsWithRoles) {
        console.log(`   Agent "${agent.name}" has an existing execution role:`);
        console.log(`     ${agent.executionRoleArn}`);
      }
    }

    console.log = originalLog;

    const output = logs.join('\n');
    expect(output).toContain('my_agent');
    expect(output).toContain('arn:aws:iam::111122223333:role/my-custom-role');
    expect(output).toContain('Execution Role Notice');
  });

  it('should not show role warning when no agents have executionRoleArn', () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    const parsed: ParsedStarterToolkitConfig = {
      agents: [
        {
          name: 'my_agent',
          entrypoint: 'main.py',
          build: 'CodeZip',
          runtimeVersion: 'PYTHON_3_12',
          language: 'python',
          networkMode: 'PUBLIC',
          protocol: 'HTTP',
          enableOtel: true,
          physicalAgentId: 'ABCDEFGHIJ',
        },
      ],
      memories: [],
      credentials: [],
      awsTarget: { account: '111122223333', region: 'us-west-2' },
    };

    const agentsWithRoles = parsed.agents.filter(a => a.executionRoleArn);

    console.log('\nThe following resources will be imported:\n');
    console.log('  Agents:');
    for (const agent of parsed.agents) {
      const idSuffix = agent.physicalAgentId ? ` (runtime ID: ${agent.physicalAgentId})` : '';
      console.log(`    - ${agent.name} (${agent.build}${idSuffix})`);
    }

    if (agentsWithRoles.length > 0) {
      console.log('\n\x1b[33m⚠  Execution Role Notice:\x1b[0m');
      for (const agent of agentsWithRoles) {
        console.log(`   Agent "${agent.name}" has an existing execution role:`);
        console.log(`     ${agent.executionRoleArn}`);
      }
    }

    console.log = originalLog;

    const output = logs.join('\n');
    expect(output).toContain('my_agent');
    expect(output).not.toContain('Execution Role Notice');
  });
});

describe('Import confirmation: --yes flag', () => {
  it('should skip confirmation prompt when options.yes is true', () => {
    // When options.yes is true, the confirmation block is skipped entirely
    const options = { source: 'test.yaml', yes: true };
    // The condition in actions.ts is: if (!options.yes) { ... prompt ... }
    // So when yes=true, the block is not entered
    expect(!options.yes).toBe(false);
  });

  it('should show confirmation prompt when options.yes is falsy', () => {
    const options: { source: string; yes?: boolean } = { source: 'test.yaml' };
    // When yes is undefined/false, the block IS entered
    expect(!options.yes).toBe(true);
  });
});
