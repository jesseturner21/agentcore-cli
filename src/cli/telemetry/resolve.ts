import { readGlobalConfig } from '../global-config.js';

export interface TelemetryPreference {
  enabled: boolean;
  source: 'environment' | 'global-config' | 'default';
}

export async function resolveTelemetryPreference(): Promise<TelemetryPreference> {
  // 1. Check AGENTCORE_TELEMETRY_DISABLED env var
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const agentcoreEnv = process.env['AGENTCORE_TELEMETRY_DISABLED'];
  if (agentcoreEnv !== undefined) {
    const normalized = agentcoreEnv.toLowerCase().trim();
    if (normalized === 'true' || normalized === '1') {
      return { enabled: false, source: 'environment' };
    }
    if (normalized === 'false' || normalized === '0') {
      return { enabled: true, source: 'environment' };
    }
  }

  // 2. Check DO_NOT_TRACK env var (cross-tool standard)
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const doNotTrack = process.env['DO_NOT_TRACK'];
  if (doNotTrack !== undefined) {
    const normalized = doNotTrack.toLowerCase().trim();
    if (normalized === '1' || normalized === 'true') {
      return { enabled: false, source: 'environment' };
    }
  }

  // 3. Check global config file
  const config = await readGlobalConfig();
  if (config.telemetry?.enabled !== undefined) {
    return { enabled: config.telemetry.enabled, source: 'global-config' };
  }

  // 4. Default: enabled
  return { enabled: true, source: 'default' };
}
