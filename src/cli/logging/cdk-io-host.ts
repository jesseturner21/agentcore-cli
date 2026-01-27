import type { ExecLogger } from './exec-logger';
import type { IIoHost, IoRequest } from '@aws-cdk/toolkit-lib';

/**
 * Create an IIoHost that captures all CDK toolkit messages to an ExecLogger.
 * This adapts the CDK toolkit's message/request system to our logging infrastructure.
 */
export function createCdkIoHost(logger: ExecLogger): IIoHost {
  return {
    notify: (msg): Promise<void> => {
      const code = msg.code ?? '';
      const text = typeof msg.message === 'string' ? msg.message : '';
      const level = mapCdkLevel(msg.level);

      // Format: [CODE] message (if code present)
      const prefix = code ? `[${code}] ` : '';
      logger.log(`${prefix}${text}`, level);
      return Promise.resolve();
    },
    requestResponse: <T>(msg: IoRequest<unknown, T>): Promise<T> => {
      const code = msg.code ?? '';
      const text = typeof msg.message === 'string' ? msg.message : '';

      logger.log(`[REQUEST] ${code ? `[${code}] ` : ''}${text}`);
      return Promise.resolve(msg.defaultResponse);
    },
  };
}

/**
 * Map CDK message levels to our logger levels
 */
function mapCdkLevel(cdkLevel?: string): 'info' | 'warn' | 'error' | 'debug' {
  switch (cdkLevel) {
    case 'error':
      return 'error';
    case 'warn':
      return 'warn';
    case 'debug':
    case 'trace':
      return 'debug';
    default:
      return 'info';
  }
}
