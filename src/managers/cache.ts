import Application from '../structures/application';
import Collection from '../structures/collection';
import User from '../structures/user';

export type CacheKey = 'user' | 'applications';

export default class CacheManager {
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
