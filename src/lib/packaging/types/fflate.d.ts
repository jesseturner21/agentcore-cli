declare module 'fflate' {
  export interface ZipOptions {
    level?: number;
  }

  export type ZippableFile = Uint8Array | string | [Uint8Array | string, ZipOptions];

  export interface Zippable {
    [path: string]: ZippableFile | Zippable;
  }

  export function zipSync(data: Zippable, options?: ZipOptions): Uint8Array;
}
