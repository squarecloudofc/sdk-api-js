import { Application, Collection, User } from '../structures';

export type CacheKey = 'user' | 'applications';

export class CacheManager {
  readonly user?: User;
  readonly applications?: Collection<string, Application>;

  set<T extends CacheKey>(key: T, value: CacheManager[T]) {
    Reflect.set(this, key, value);
  }

  get<T extends CacheKey>(key: T): CacheManager[T] {
    return this[key];
  }

  clear(key?: CacheKey) {
    if (key) {
      Reflect.set(this, key, undefined);
    } else {
      Reflect.set(this, 'user', undefined);
      Reflect.set(this, 'applications', undefined);
    }
  }
}
