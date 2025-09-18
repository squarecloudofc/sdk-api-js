import type { ApplicationStatus } from "@/structures";
import type { Backup } from "@/structures/backup";

import { BaseCacheService } from "./base";

export interface ApplicationCache {
  readonly status?: ApplicationStatus;
  readonly backups?: Backup[];
  readonly logs?: string;
}

export class ApplicationCacheService extends BaseCacheService<ApplicationCache> {
  protected cache: ApplicationCache = {
    status: undefined,
    backups: undefined,
    logs: undefined,
  };

  get status() {
    return this.cache.status;
  }

  get backups() {
    return this.cache.backups;
  }

  get logs() {
    return this.cache.logs;
  }
}
