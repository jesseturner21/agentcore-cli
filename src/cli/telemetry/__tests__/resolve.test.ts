import * as globalConfig from '../../global-config';
import { resolveTelemetryPreference } from '../resolve';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../global-config');

const mockReadGlobalConfig = vi.mocked(globalConfig.readGlobalConfig);

describe('resolveTelemetryPreference', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // eslint-disable-next-line @typescript-eslint/dot-notation
    delete process.env['AGENTCORE_TELEMETRY_DISABLED'];
    // eslint-disable-next-line @typescript-eslint/dot-notation
    delete process.env['DO_NOT_TRACK'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('AGENTCORE_TELEMETRY_DISABLED env var', () => {
    it('disables telemetry when set to "true"', async () => {
      process.env.AGENTCORE_TELEMETRY_DISABLED = 'true';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: false, source: 'environment' });
    });

    it('disables telemetry when set to "1"', async () => {
      process.env.AGENTCORE_TELEMETRY_DISABLED = '1';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: false, source: 'environment' });
    });

    it('enables telemetry when set to "false"', async () => {
      process.env.AGENTCORE_TELEMETRY_DISABLED = 'false';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: true, source: 'environment' });
    });

    it('enables telemetry when set to "0"', async () => {
      process.env.AGENTCORE_TELEMETRY_DISABLED = '0';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: true, source: 'environment' });
    });

    it('is case-insensitive', async () => {
      process.env.AGENTCORE_TELEMETRY_DISABLED = 'TRUE';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: false, source: 'environment' });
    });
  });

  describe('DO_NOT_TRACK env var', () => {
    it('disables telemetry when set to "1"', async () => {
      process.env.DO_NOT_TRACK = '1';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: false, source: 'environment' });
    });

    it('disables telemetry when set to "true"', async () => {
      process.env.DO_NOT_TRACK = 'true';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: false, source: 'environment' });
    });

    it('AGENTCORE_TELEMETRY_DISABLED takes priority over DO_NOT_TRACK', async () => {
      process.env.AGENTCORE_TELEMETRY_DISABLED = 'false';
      process.env.DO_NOT_TRACK = '1';

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: true, source: 'environment' });
    });
  });

  describe('global config', () => {
    it('uses config file when no env vars set', async () => {
      mockReadGlobalConfig.mockResolvedValue({ telemetry: { enabled: false } });

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: false, source: 'global-config' });
    });

    it('uses config file enabled value', async () => {
      mockReadGlobalConfig.mockResolvedValue({ telemetry: { enabled: true } });

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: true, source: 'global-config' });
    });
  });

  describe('default', () => {
    it('defaults to enabled when no env vars or config', async () => {
      mockReadGlobalConfig.mockResolvedValue({});

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: true, source: 'default' });
    });

    it('defaults to enabled when config has no telemetry section', async () => {
      mockReadGlobalConfig.mockResolvedValue({});

      const result = await resolveTelemetryPreference();

      expect(result).toEqual({ enabled: true, source: 'default' });
    });
  });
});
