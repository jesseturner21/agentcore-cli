import { readFile, writeFile } from 'fs/promises';
import type { ZodType } from 'zod';

export interface LoadDocumentResult {
  content: string;
  validationError?: string;
}

export interface SaveDocumentResult {
  ok: boolean;
  content?: string;
  error?: string;
}

/**
 * Loads a JSON document and optionally validates it against a schema.
 * Returns the raw content and any validation errors.
 */
export async function loadSchemaDocument<T>(filePath: string, schema: ZodType<T>): Promise<LoadDocumentResult> {
  const content = await readFile(filePath, 'utf-8');

  let validationError: string | undefined;
  try {
    const parsed: unknown = JSON.parse(content);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      validationError = result.error.message;
    }
  } catch (err) {
    validationError = err instanceof Error ? err.message : 'Invalid JSON';
  }

  return { content, validationError };
}

/**
 * Validates and saves a JSON document.
 * Returns the formatted content on success, or an error message on failure.
 */
export async function saveSchemaDocument<T>(
  filePath: string,
  content: string,
  schema: ZodType<T>
): Promise<SaveDocumentResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON' };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }

  const formatted = JSON.stringify(result.data, null, 2);
  try {
    await writeFile(filePath, formatted, 'utf-8');
    return { ok: true, content: formatted };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to write file' };
  }
}
