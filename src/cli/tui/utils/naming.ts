/**
 * Shared naming utilities for wizard screens.
 */

export interface GenerateUniqueNameOptions {
  /** Separator between base name and counter (default: empty string) */
  separator?: string;
}

/**
 * Generate a unique name that doesn't conflict with existing names.
 * Appends a numeric suffix if needed (e.g., "MyAgent" -> "MyAgent1" -> "MyAgent2").
 *
 * @param baseName - The preferred base name
 * @param existingNames - List of names that already exist
 * @param options - Optional configuration
 * @returns A unique name
 */
export function generateUniqueName(
  baseName: string,
  existingNames: string[],
  options?: GenerateUniqueNameOptions
): string {
  const separator = options?.separator ?? '';

  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 1;
  while (existingNames.includes(`${baseName}${separator}${counter}`)) {
    counter++;
  }
  return `${baseName}${separator}${counter}`;
}
