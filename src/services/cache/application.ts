import type { ApplicationStatus } from "@/structures";
import type { Snapshot } from "@/structures/snapshot";

import { BaseCacheService } from "./base";

export interface ApplicationCache {
  readonly status?: ApplicationStatus;
  readonly snapshots?: Snapshot[];
  readonly logs?: string;
}

export class ApplicationCacheService extends BaseCacheService<ApplicationCache> {
  protected cache: ApplicationCache = {
    status: undefined,
    snapshots: undefined,
    logs: undefined,
  };

  get status() {
    return this.cache.status;
  }

  get snapshots() {
    return this.cache.snapshots;
  }

  get logs() {
    return this.cache.logs;
  }
}
