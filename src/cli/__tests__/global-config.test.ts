import { GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_FILE, readGlobalConfig, updateGlobalConfig } from '../global-config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs/promises');

const mockMkdir = vi.mocked(mkdir);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);

describe('global-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readGlobalConfig', () => {
    it('returns parsed config when file exists', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ telemetry: { enabled: false } }));

      const config = await readGlobalConfig();

      expect(config).toEqual({ telemetry: { enabled: false } });
      expect(mockReadFile).toHaveBeenCalledWith(GLOBAL_CONFIG_FILE, 'utf-8');
    });

    it('returns empty object when file does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const config = await readGlobalConfig();

      expect(config).toEqual({});
    });

    it('returns empty object when file contains invalid JSON', async () => {
      mockReadFile.mockResolvedValue('not json');

      const config = await readGlobalConfig();

      expect(config).toEqual({});
    });
  });

  describe('updateGlobalConfig', () => {
    it('creates directory and writes merged config', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ telemetry: { enabled: true } }));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await updateGlobalConfig({ telemetry: { enabled: false } });

      expect(mockMkdir).toHaveBeenCalledWith(GLOBAL_CONFIG_DIR, { recursive: true });
      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written).toEqual({ telemetry: { enabled: false } });
    });

    it('merges telemetry sub-object without overwriting other keys', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ telemetry: { enabled: true } }));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await updateGlobalConfig({ telemetry: { enabled: false } });

      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written).toEqual({ telemetry: { enabled: false } });
    });

    it('silently ignores write failures', async () => {
      mockReadFile.mockResolvedValue('{}');
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(new Error('EACCES'));

      // Should not throw
      await updateGlobalConfig({ telemetry: { enabled: true } });
    });

    it('handles missing existing config gracefully', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await updateGlobalConfig({ telemetry: { enabled: true } });

      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written).toEqual({ telemetry: { enabled: true } });
    });
  });
});
