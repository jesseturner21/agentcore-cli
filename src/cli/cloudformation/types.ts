import type { StackEvent } from '@aws-sdk/client-cloudformation';

export const TERMINAL_STACK_STATUSES = new Set([
  'CREATE_COMPLETE',
  'UPDATE_COMPLETE',
  'UPDATE_ROLLBACK_COMPLETE',
  'ROLLBACK_COMPLETE',
  'CREATE_FAILED',
  'DELETE_FAILED',
  'DELETE_COMPLETE',
  'UPDATE_ROLLBACK_FAILED',
  'ROLLBACK_FAILED',
  'IMPORT_COMPLETE',
  'IMPORT_ROLLBACK_COMPLETE',
  'IMPORT_ROLLBACK_FAILED',
]);

export const FAILURE_LIKE = (s?: string) =>
  !!s && (s.endsWith('_FAILED') || s.includes('ROLLBACK') || s === 'DELETE_FAILED');

export function getStatusColor(status: string): 'green' | 'red' | 'yellow' | 'white' {
  if (status.includes('COMPLETE') && !status.includes('ROLLBACK')) return 'green';
  if (status.includes('FAILED') || status.includes('ROLLBACK')) return 'red';
  if (status.includes('PROGRESS') || status.includes('IN_PROGRESS')) return 'yellow';
  return 'white';
}

export function isFailureEvent(ev: StackEvent) {
  return (ev.ResourceStatus ?? '').endsWith('FAILED');
}
