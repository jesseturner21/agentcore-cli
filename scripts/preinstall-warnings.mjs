import { execSync } from 'node:child_process';
import { platform } from 'node:os';

try {
  // Check if an `agentcore` binary exists on PATH
  const whichCmd = platform() === 'win32' ? 'where agentcore' : 'command -v agentcore';
  execSync(whichCmd, { stdio: 'ignore' });

  // Binary exists — check if it supports --version (the new CLI does, the old Python one does not)
  try {
    execSync('agentcore --version', { stdio: 'ignore' });
  } catch {
    // --version failed → likely the old Python CLI
    console.warn(
      [
        '',
        '\x1b[33m⚠ WARNING: We detected an older version of the AgentCore CLI.\x1b[0m',
        '\x1b[33mFor the best experience, we recommend uninstalling it using:\x1b[0m',
        '\x1b[33m  pip uninstall bedrock-agentcore-starter-toolkit\x1b[0m',
        '',
      ].join('\n')
    );
  }
} catch {
  // No agentcore binary found or unexpected error — nothing to do
}

// Telemetry notice — shown on every install/upgrade
try {
  console.warn(
    [
      '',
      '\x1b[33m⚠ NOTICE: The AgentCore CLI collects aggregated, anonymous usage\x1b[0m',
      '\x1b[33manalytics to help improve the tool. To opt out, run:\x1b[0m',
      '\x1b[33m  agentcore telemetry disable\x1b[0m',
      '\x1b[33mOr set: AGENTCORE_TELEMETRY_DISABLED=true\x1b[0m',
      '',
    ].join('\n')
  );
} catch {
  // Never fail the install
}
