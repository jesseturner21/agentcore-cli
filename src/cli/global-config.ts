import { mkdir, readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

export const GLOBAL_CONFIG_DIR = join(homedir(), '.agentcore');
export const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_DIR, 'config.json');

export interface GlobalConfig {
  telemetry?: {
    enabled?: boolean;
  };
}

export async function readGlobalConfig(): Promise<GlobalConfig> {
  try {
    const data = await readFile(GLOBAL_CONFIG_FILE, 'utf-8');
    return JSON.parse(data) as GlobalConfig;
  } catch {
    return {};
  }
}

export async function updateGlobalConfig(partial: GlobalConfig): Promise<void> {
  try {
    const existing = await readGlobalConfig();

    // Shallow merge with one level of nesting for telemetry sub-object
    const merged: GlobalConfig = { ...existing };

    if (partial.telemetry !== undefined) {
      merged.telemetry = { ...existing.telemetry, ...partial.telemetry };
    }

    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
    await writeFile(GLOBAL_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch {
    // Silently ignore write failures
  }
}
