import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the template root directory.
 * Uses import.meta.url for runtime resolution (works in bundled CLI).
 */
function getTemplateRoot(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Bundled CLI: dist/cli/index.mjs -> ../assets -> dist/assets
  const bundledPath = resolve(__dirname, '../assets');
  if (existsSync(join(bundledPath, 'cdk'))) {
    return bundledPath;
  }

  // Source mode: src/cli/templates -> ../../assets -> src/assets
  const sourcePath = resolve(__dirname, '../../assets');
  if (existsSync(join(sourcePath, 'cdk'))) {
    return sourcePath;
  }

  // Fallback
  return bundledPath;
}

export const TEMPLATE_ROOT = getTemplateRoot();

export function getTemplatePath(...segments: string[]): string {
  return join(TEMPLATE_ROOT, ...segments);
}
