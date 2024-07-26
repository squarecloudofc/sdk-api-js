import type { APIApplicationBackup } from "@squarecloud/api-types/v2";

import type { ApplicationStatus } from "@/structures";
import { BaseCacheService } from "./base";

export interface ApplicationCache {
	readonly status?: ApplicationStatus;
	readonly backups?: APIApplicationBackup[];
	readonly logs?: string;
}

export class ApplicationCacheService extends BaseCacheService<ApplicationCache> {
	protected defaults: ApplicationCache = {
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
