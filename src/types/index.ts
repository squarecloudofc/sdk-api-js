export * from './api';
export * from './enums';

export interface APIOptions {
  /** Whether experimental features should be enabled or not */
  experimental: boolean;
}

export type APIRootPath = 'public' | 'experimental';

export type APIVersion<TVersion extends number> = `v${TVersion}`;