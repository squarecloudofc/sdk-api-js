export class BaseCacheService<
	Struct extends object,
	Keys extends keyof Struct = keyof Struct,
> {
	protected cache: Struct;

	set<T extends Keys>(key: T, value: Struct[T]) {
		Reflect.set(this, key, value);
	}

	get<T extends Keys>(key: T): Struct[T] {
		return this.cache[key];
	}

	remove<T extends Keys>(key: T) {
		Reflect.set(this.cache, key, undefined);
	}
}
