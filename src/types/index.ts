export * from './api';
export * from './enums';

export interface APIOptions {
  experimental: boolean;
}

export type APIRootPath = 'public' | 'experimental';

export type APIVersion<TVersion extends number> = `v${TVersion}`;