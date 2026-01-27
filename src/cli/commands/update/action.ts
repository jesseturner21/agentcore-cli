import { PACKAGE_VERSION, getDistroConfig } from '../../constants';
import { execSync } from 'child_process';

const distroConfig = getDistroConfig();

export async function fetchLatestVersion(): Promise<string> {
  const registryUrl = `${distroConfig.registryUrl}/${distroConfig.packageName}/latest`;
  const response = await fetch(registryUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest version: ${response.statusText}`);
  }
  const data = (await response.json()) as { version: string };
  return data.version;
}

export function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const curr = currentParts[i] ?? 0;
    const lat = latestParts[i] ?? 0;
    if (lat > curr) return 1;
    if (lat < curr) return -1;
  }
  return 0;
}

export type UpdateStatus = 'up-to-date' | 'newer-local' | 'update-available' | 'updated' | 'update-failed';

export interface UpdateResult {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
}

export async function handleUpdate(checkOnly: boolean): Promise<UpdateResult> {
  const latestVersion = await fetchLatestVersion();
  const comparison = compareVersions(PACKAGE_VERSION, latestVersion);

  if (comparison === 0) {
    return { status: 'up-to-date', currentVersion: PACKAGE_VERSION, latestVersion };
  }

  if (comparison < 0) {
    return { status: 'newer-local', currentVersion: PACKAGE_VERSION, latestVersion };
  }

  if (checkOnly) {
    return { status: 'update-available', currentVersion: PACKAGE_VERSION, latestVersion };
  }

  try {
    execSync(distroConfig.installCommand, { stdio: 'inherit' });
    return { status: 'updated', currentVersion: PACKAGE_VERSION, latestVersion };
  } catch {
    return { status: 'update-failed', currentVersion: PACKAGE_VERSION, latestVersion };
  }
}
