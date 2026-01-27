import os from 'node:os';
import path from 'node:path';

export interface ShellCommandConfig {
  executable: string;
  args: string[];
}

/**
 * Wraps a user command with logic to load shell configuration
 * (aliases, PATH, env vars) without triggering interactive-mode output.
 *
 * This is intentionally best-effort, not a full shell emulation.
 */
export function wrapCommandWithShellConfig(command: string): ShellCommandConfig {
  const platform = os.platform();
  const rawShellPath = process.env.SHELL ?? '';
  const shellPath = rawShellPath.toLowerCase();
  const homeDir = os.homedir();

  /**
   * 1. PowerShell (Windows default or cross-platform pwsh)
   *
   * PowerShell loads $PROFILE automatically when using -Command,
   * unless -NoProfile is specified. We rely on that behavior.
   */
  if (platform === 'win32' || shellPath.includes('powershell') || shellPath.includes('pwsh')) {
    return {
      executable: rawShellPath || 'powershell.exe',
      args: ['-Command', command],
    };
  }

  /**
   * 2. Zsh
   *
   * Aliases must be expanded AFTER they're defined. Since zsh parses
   * the entire -c string before execution, we use eval to defer
   * parsing of the user command until after sourcing config.
   * Pass command as $1 to avoid quoting issues.
   */
  if (shellPath.includes('zsh')) {
    const zshrc = path.join(homeDir, '.zshrc');
    const wrappedCmd = `source "${zshrc}" 2>/dev/null; eval "$1"`;

    return {
      executable: rawShellPath,
      args: ['-c', wrappedCmd, 'zsh', command],
    };
  }

  /**
   * 3. Bash
   *
   * Bash disables alias expansion in non-interactive shells by default.
   * We source config, enable alias expansion, then use eval to defer
   * parsing until after aliases are defined.
   */
  if (shellPath.includes('bash')) {
    const bashrc = path.join(homeDir, '.bashrc');
    const bashProfile = path.join(homeDir, '.bash_profile');

    const sourceLogic =
      `[ -f "${bashrc}" ] && source "${bashrc}" || ` + `[ -f "${bashProfile}" ] && source "${bashProfile}"`;

    const wrappedCmd = `${sourceLogic}; shopt -s expand_aliases; eval "$1"`;

    return {
      executable: rawShellPath,
      args: ['-c', wrappedCmd, 'bash', command],
    };
  }

  /**
   * 4. Fish
   *
   * Fish functions/aliases are auto-loaded. However, we still use eval
   * to ensure any config-defined abbreviations are available.
   */
  if (shellPath.includes('fish')) {
    return {
      executable: rawShellPath,
      args: ['-c', 'eval $argv[1]', '--', command],
    };
  }

  /**
   * 5. Fallback: generic POSIX shell
   *
   * Use eval with command as argument for consistent behavior.
   */
  return {
    executable: rawShellPath || '/bin/sh',
    args: ['-c', 'eval "$1"', 'sh', command],
  };
}
