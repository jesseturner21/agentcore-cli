import { updateGlobalConfig } from '../../global-config.js';
import { resolveTelemetryPreference } from '../../telemetry/resolve.js';

export async function handleTelemetryDisable(): Promise<void> {
  await updateGlobalConfig({ telemetry: { enabled: false } });
  console.log('Telemetry has been disabled.');
}

export async function handleTelemetryEnable(): Promise<void> {
  await updateGlobalConfig({ telemetry: { enabled: true } });
  console.log('Telemetry has been enabled.');
}

export async function handleTelemetryStatus(): Promise<void> {
  const pref = await resolveTelemetryPreference();

  const status = pref.enabled ? 'Enabled' : 'Disabled';

  const sourceLabel =
    pref.source === 'environment'
      ? 'environment variable'
      : pref.source === 'global-config'
        ? 'global config (~/.agentcore/config.json)'
        : 'default';

  console.log(`Telemetry: ${status}`);
  console.log(`Source: ${sourceLabel}`);

  if (pref.source === 'environment') {
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const agentcoreEnv = process.env['AGENTCORE_TELEMETRY_DISABLED'];
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const doNotTrack = process.env['DO_NOT_TRACK'];
    if (agentcoreEnv !== undefined) {
      console.log(`\nNote: AGENTCORE_TELEMETRY_DISABLED=${agentcoreEnv} is set in your environment.`);
    } else if (doNotTrack !== undefined) {
      console.log(`\nNote: DO_NOT_TRACK=${doNotTrack} is set in your environment.`);
    }
  }
}
