import * as globalConfig from '../../../global-config';
import * as resolve from '../../../telemetry/resolve';
import { handleTelemetryDisable, handleTelemetryEnable, handleTelemetryStatus } from '../actions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../global-config');
vi.mock('../../../telemetry/resolve');

const mockUpdateGlobalConfig = vi.mocked(globalConfig.updateGlobalConfig);
const mockResolveTelemetryPreference = vi.mocked(resolve.resolveTelemetryPreference);

describe('telemetry actions', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockUpdateGlobalConfig.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('handleTelemetryDisable', () => {
    it('writes disabled config and prints confirmation', async () => {
      await handleTelemetryDisable();

      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({ telemetry: { enabled: false } });
      expect(consoleSpy).toHaveBeenCalledWith('Telemetry has been disabled.');
    });
  });

  describe('handleTelemetryEnable', () => {
    it('writes enabled config and prints confirmation', async () => {
      await handleTelemetryEnable();

      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({ telemetry: { enabled: true } });
      expect(consoleSpy).toHaveBeenCalledWith('Telemetry has been enabled.');
    });
  });

  describe('handleTelemetryStatus', () => {
    it('shows enabled status with default source', async () => {
      mockResolveTelemetryPreference.mockResolvedValue({ enabled: true, source: 'default' });

      await handleTelemetryStatus();

      expect(consoleSpy).toHaveBeenCalledWith('Telemetry: Enabled');
      expect(consoleSpy).toHaveBeenCalledWith('Source: default');
    });

    it('shows disabled status with global-config source', async () => {
      mockResolveTelemetryPreference.mockResolvedValue({ enabled: false, source: 'global-config' });

      await handleTelemetryStatus();

      expect(consoleSpy).toHaveBeenCalledWith('Telemetry: Disabled');
      expect(consoleSpy).toHaveBeenCalledWith('Source: global config (~/.agentcore/config.json)');
    });

    it('shows env var note when source is environment (AGENTCORE_TELEMETRY_DISABLED)', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, AGENTCORE_TELEMETRY_DISABLED: 'true' };

      mockResolveTelemetryPreference.mockResolvedValue({ enabled: false, source: 'environment' });

      await handleTelemetryStatus();

      expect(consoleSpy).toHaveBeenCalledWith('Telemetry: Disabled');
      expect(consoleSpy).toHaveBeenCalledWith('Source: environment variable');
      expect(consoleSpy).toHaveBeenCalledWith('\nNote: AGENTCORE_TELEMETRY_DISABLED=true is set in your environment.');

      process.env = originalEnv;
    });

    it('shows env var note when source is environment (DO_NOT_TRACK)', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, DO_NOT_TRACK: '1' };
      delete process.env.AGENTCORE_TELEMETRY_DISABLED;

      mockResolveTelemetryPreference.mockResolvedValue({ enabled: false, source: 'environment' });

      await handleTelemetryStatus();

      expect(consoleSpy).toHaveBeenCalledWith('\nNote: DO_NOT_TRACK=1 is set in your environment.');

      process.env = originalEnv;
    });
  });
});
