import type { ShellMode } from '../../shell';
import { createContext, useContext } from 'react';

export interface ShellContextValue {
  mode: ShellMode;
  command: string;
  output: string[];
  exitCode: number | null;
  isActive: boolean;
}

const defaultValue: ShellContextValue = {
  mode: 'inactive',
  command: '',
  output: [],
  exitCode: null,
  isActive: false,
};

export const ShellContext = createContext<ShellContextValue>(defaultValue);

export function useShellContext(): ShellContextValue {
  return useContext(ShellContext);
}
