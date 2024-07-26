import type { User } from "@/structures";
import { BaseCacheService } from "./base";

export interface GlobalCache {
	readonly user?: User;
}

export class GlobalCacheService extends BaseCacheService<GlobalCache> {
	protected defaults: GlobalCache = {
		user: undefined,
	};

	get user() {
		return this.cache.user;
	}
}
