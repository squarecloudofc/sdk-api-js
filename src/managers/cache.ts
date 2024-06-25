import type { User } from "..";

export type CacheKey = "user";

export class CacheManager {
	readonly user?: User;

	set<T extends CacheKey>(key: T, value: CacheManager[T]) {
		Reflect.set(this, key, value);
	}

	get<T extends CacheKey>(key: T): CacheManager[T] {
		return this[key];
	}

	clear() {
		Reflect.set(this, "user", undefined);
	}
}
