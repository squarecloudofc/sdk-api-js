export * from './api';
export * from './enums';

export interface APIOptions<Ex extends boolean = false> {
  /** Whether experimental features should be enabled or not */
  experimental: Ex;
}

export type APIRootPath = 'public' | 'experimental';

export type APIVersion<TVersion extends number> = `v${TVersion}`;
