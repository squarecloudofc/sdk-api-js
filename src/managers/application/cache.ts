import type { ApplicationStatus } from "@/structures";
import type { RESTPostAPIApplicationBackupResult } from "@squarecloud/api-types/v2";

export type ApplicationCacheKey = "status" | "backup" | "logs";

export class ApplicationCacheManager {
	readonly status?: ApplicationStatus;
	readonly backup?: RESTPostAPIApplicationBackupResult;
	readonly logs?: string;

	set<T extends ApplicationCacheKey>(
		key: T,
		value: ApplicationCacheManager[T],
	) {
		Reflect.set(this, key, value);
	}

	get<T extends ApplicationCacheKey>(key: T): ApplicationCacheManager[T] {
		return this[key];
	}

	clear(key?: ApplicationCacheKey) {
		if (key) {
			Reflect.set(this, key, undefined);
		} else {
			Reflect.set(this, "status", undefined);
			Reflect.set(this, "backup", undefined);
			Reflect.set(this, "logs", undefined);
		}
	}
}
