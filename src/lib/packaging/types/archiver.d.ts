declare module 'archiver' {
  import type { Stats } from 'fs';
  import type { Writable } from 'stream';

  export interface ArchiverOptions {
    zlib?: {
      level?: number;
    };
  }

  export interface EntryData {
    name?: string;
    prefix?: string;
    stats?: Stats;
  }

  export interface ProgressData {
    entries: {
      total: number;
      processed: number;
    };
    fs?: {
      totalBytes?: number;
      processedBytes?: number;
    };
  }

  export interface Archiver {
    directory(source: string, destination?: string | false, data?: EntryData): Archiver;
    pipe(stream: Writable): Writable;
    finalize(): Promise<void>;
    on(event: 'warning', handler: (error: NodeJS.ErrnoException) => void): this;
    on(event: 'error', handler: (error: Error) => void): this;
    on(event: 'finish', handler: () => void): this;
    on(event: 'end', handler: () => void): this;
    on(event: 'close', handler: () => void): this;
    on(event: 'entry', handler: (entry: EntryData) => void): this;
    on(event: 'progress', handler: (data: ProgressData) => void): this;
  }

  export default function archiver(format: 'zip', options?: ArchiverOptions): Archiver;
}
