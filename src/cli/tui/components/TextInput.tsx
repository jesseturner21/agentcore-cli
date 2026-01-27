import { Cursor } from './Cursor';
import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { ZodString } from 'zod';

/** Custom validation beyond schema - returns true if valid, or error message string if invalid */
type CustomValidation = (value: string) => true | string;

interface TextInputProps {
  prompt: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  initialValue?: string;
  /** Zod string schema for validation - error message is extracted from schema */
  schema?: ZodString;
  /** Custom validation beyond schema - both validate function and error message are required together */
  customValidation?: CustomValidation;
  allowEmpty?: boolean;
  /** Mask character to hide input (e.g., '*' for passwords/API keys) */
  mask?: string;
  /** Hide the built-in "> " prompt arrow (default false) */
  hideArrow?: boolean;
}

function validateValue(value: string, schema?: ZodString, customValidation?: CustomValidation): string | undefined {
  if (!value) return undefined;

  if (customValidation) {
    const result = customValidation(value);
    if (result !== true) {
      return result;
    }
  }

  if (schema) {
    const parseResult = schema.safeParse(value);
    if (!parseResult.success) {
      return parseResult.error.issues[0]?.message;
    }
  }

  return undefined;
}

export function TextInput({
  prompt,
  onSubmit,
  onCancel,
  placeholder,
  initialValue = '',
  schema,
  customValidation,
  allowEmpty = false,
  mask,
  hideArrow = false,
}: TextInputProps) {
  const [value, setValue] = useState(initialValue);
  const [showError, setShowError] = useState(false);

  const trimmed = value.trim();
  const validationErrorMsg = validateValue(trimmed, schema, customValidation);
  const isValid = !validationErrorMsg;

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      const trimmedValue = value.trim();
      const hasValue = allowEmpty || trimmedValue;
      const validationError = validateValue(trimmedValue, schema, customValidation);

      if (hasValue && !validationError) {
        onSubmit(trimmedValue);
      } else {
        setShowError(true);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1));
      setShowError(false);
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setValue(v => v + input);
      setShowError(false);
    }
  });

  const hasInput = trimmed.length > 0;
  const hasValidation = Boolean(schema ?? customValidation);
  const showCheckmark = hasInput && isValid && hasValidation;

  const displayValue = mask ? mask.repeat(value.length) : value;

  return (
    <Box flexDirection="column">
      {prompt && <Text>{prompt}</Text>}
      <Box>
        {!hideArrow && <Text color="cyan">&gt; </Text>}
        <Text>{displayValue ?? (placeholder ? <Text dimColor>{placeholder}</Text> : null)}</Text>
        <Cursor />
        {showCheckmark && <Text color="green"> ✓</Text>}
      </Box>
      {showError && validationErrorMsg && <Text color="red">{validationErrorMsg}</Text>}
    </Box>
  );
}
