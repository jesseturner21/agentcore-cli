import { type SaveDocumentResult, loadSchemaDocument, saveSchemaDocument } from '../../schema';
import { useCallback, useState } from 'react';
import type { ZodType } from 'zod';

interface DocumentStatus {
  status: 'loading' | 'ready' | 'error';
  message?: string;
}

export function useSchemaDocument<T>(filePath: string, schema: ZodType<T>) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<DocumentStatus>({ status: 'loading' });
  const [validationMessage, setValidationMessage] = useState<string | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);

  const load = useCallback(async () => {
    setStatus({ status: 'loading' });
    setValidationMessage(undefined);

    try {
      const result = await loadSchemaDocument(filePath, schema);
      setContent(result.content);
      setValidationMessage(result.validationError);
      setStatus({ status: 'ready' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      setStatus({ status: 'error', message });
    }
  }, [filePath, schema]);

  const save = useCallback(
    async (nextContent: string): Promise<SaveDocumentResult> => {
      const result = await saveSchemaDocument(filePath, nextContent, schema);
      if (result.ok && result.content) {
        setContent(result.content);
        setValidationMessage(undefined);
      }
      return result;
    },
    [filePath, schema]
  );

  if (!isInitialized) {
    setIsInitialized(true);
    void load();
  }

  return {
    content,
    status,
    validationMessage,
    reload: load,
    save,
  };
}
