/**
 * @internal
 */
export interface CollectionConstructor {
  new (): Collection<unknown, unknown>;
  new <K, V>(entries?: readonly (readonly [K, V])[] | null): Collection<K, V>;
  new <K, V>(iterable: Iterable<readonly [K, V]>): Collection<K, V>;
  readonly prototype: Collection<unknown, unknown>;
  readonly [Symbol.species]: CollectionConstructor;
}

/**
 * Separate interface for the constructor so that emitted js does not have a constructor that overwrites itself
 *
 * @internal
 */
export interface Collection<K, V> extends Map<K, V> {
  constructor: CollectionConstructor;
}

/**
 * A Map with additional utility methods. This is used throughout discord.js rather than Arrays for anything that has
 * an ID, for significantly improved performance and ease-of-use.
 *
 * @typeParam K - The key type this collection holds
 * @typeParam V - The value type this collection holds
 */
export class Collection<K, V> extends Map<K, V> {
  /**
   * Obtains the first value(s) in this collection.
   *
   * @param amount - Amount of values to obtain from the beginning
   * @returns A single value if no amount is provided or an array of values, starting from the end if amount is negative
   */
  public first(): V | undefined;
  public first(amount: number): V[];
  public first(amount?: number): V | V[] | undefined {
    if (typeof amount === 'undefined') return this.values().next().value;
    if (amount < 0) return this.last(amount * -1);
    amount = Math.min(this.size, amount);
    const iter = this.values();
    return Array.from({ length: amount }, (): V => iter.next().value);
  }

  /**
   * Obtains the last value(s) in this collection.
   *
   * @param amount - Amount of values to obtain from the end
   * @returns A single value if no amount is provided or an array of values, starting from the start if
   * amount is negative
   */
  public last(): V | undefined;
  public last(amount: number): V[];
  public last(amount?: number): V | V[] | undefined {
    const arr = [...this.values()];
    if (typeof amount === 'undefined') return arr[arr.length - 1];
    if (amount < 0) return this.first(amount * -1);
    if (!amount) return [];
    return arr.slice(-amount);
  }

  /**
   * Identical to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse Array.reverse()}
   * but returns a Collection instead of an Array.
   */
  public reverse() {
    const entries = [...this.entries()].reverse();
    this.clear();
    for (const [key, value] of entries) this.set(key, value);
    return this;
  }

  /**
   * Searches for a single item where the given function returns a truthy value. This behaves like
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find Array.find()}.
   *
   * @param fn - The function to test with (should return boolean)
   * @param thisArg - Value to use as `this` when executing function
   * @example
   * ```ts
   * collection.find(user => user.username === 'Bob');
   * ```
   */
  public find<V2 extends V>(
    fn: (value: V, key: K, collection: this) => value is V2
  ): V2 | undefined;
  public find(
    fn: (value: V, key: K, collection: this) => unknown
  ): V | undefined;
  public find<This, V2 extends V>(
    fn: (this: This, value: V, key: K, collection: this) => value is V2,
    thisArg: This
  ): V2 | undefined;
  public find<This>(
    fn: (this: This, value: V, key: K, collection: this) => unknown,
    thisArg: This
  ): V | undefined;
  public find(
    fn: (value: V, key: K, collection: this) => unknown,
    thisArg?: unknown
  ): V | undefined {
    if (typeof fn !== 'function')
      throw new TypeError(`${fn} is not a function`);
    if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
    for (const [key, val] of this) {
      if (fn(val, key, this)) return val;
    }

    return;
  }

  /**
   * Identical to
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter Array.filter()},
   * but returns a Collection instead of an Array.
   *
   * @param fn - The function to test with (should return boolean)
   * @param thisArg - Value to use as `this` when executing function
   * @example
   * ```ts
   * collection.filter(user => user.username === 'Bob');
   * ```
   */
  public filter<K2 extends K>(
    fn: (value: V, key: K, collection: this) => key is K2
  ): Collection<K2, V>;
  public filter<V2 extends V>(
    fn: (value: V, key: K, collection: this) => value is V2
  ): Collection<K, V2>;
  public filter(
    fn: (value: V, key: K, collection: this) => unknown
  ): Collection<K, V>;
  public filter<This, K2 extends K>(
    fn: (this: This, value: V, key: K, collection: this) => key is K2,
    thisArg: This
  ): Collection<K2, V>;
  public filter<This, V2 extends V>(
    fn: (this: This, value: V, key: K, collection: this) => value is V2,
    thisArg: This
  ): Collection<K, V2>;
  public filter<This>(
    fn: (this: This, value: V, key: K, collection: this) => unknown,
    thisArg: This
  ): Collection<K, V>;
  public filter(
    fn: (value: V, key: K, collection: this) => unknown,
    thisArg?: unknown
  ): Collection<K, V> {
    if (typeof fn !== 'function')
      throw new TypeError(`${fn} is not a function`);
    if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
    const results = new this.constructor[Symbol.species]<K, V>();
    for (const [key, val] of this) {
      if (fn(val, key, this)) results.set(key, val);
    }

    return results;
  }

  /**
   * Maps each item to another value into an array. Identical in behavior to
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map Array.map()}.
   *
   * @param fn - Function that produces an element of the new array, taking three arguments
   * @param thisArg - Value to use as `this` when executing function
   * @example
   * ```ts
   * collection.map(user => user.tag);
   * ```
   */
  public map<T>(fn: (value: V, key: K, collection: this) => T): T[];
  public map<This, T>(
    fn: (this: This, value: V, key: K, collection: this) => T,
    thisArg: This
  ): T[];
  public map<T>(
    fn: (value: V, key: K, collection: this) => T,
    thisArg?: unknown
  ): T[] {
    if (typeof fn !== 'function')
      throw new TypeError(`${fn} is not a function`);
    if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
    const iter = this.entries();
    return Array.from({ length: this.size }, (): T => {
      const [key, value] = iter.next().value;
      return fn(value, key, this);
    });
  }

  /**
   * Checks if there exists an item that passes a test. Identical in behavior to
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some Array.some()}.
   *
   * @param fn - Function used to test (should return a boolean)
   * @param thisArg - Value to use as `this` when executing function
   * @example
   * ```ts
   * collection.some(user => user.discriminator === '0000');
   * ```
   */
  public some(fn: (value: V, key: K, collection: this) => unknown): boolean;
  public some<T>(
    fn: (this: T, value: V, key: K, collection: this) => unknown,
    thisArg: T
  ): boolean;
  public some(
    fn: (value: V, key: K, collection: this) => unknown,
    thisArg?: unknown
  ): boolean {
    if (typeof fn !== 'function')
      throw new TypeError(`${fn} is not a function`);
    if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
    for (const [key, val] of this) {
      if (fn(val, key, this)) return true;
    }

    return false;
  }

  /**
   * Checks if all items passes a test. Identical in behavior to
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every Array.every()}.
   *
   * @param fn - Function used to test (should return a boolean)
   * @param thisArg - Value to use as `this` when executing function
   * @example
   * ```ts
   * collection.every(user => !user.bot);
   * ```
   */
  public every<K2 extends K>(
    fn: (value: V, key: K, collection: this) => key is K2
  ): this is Collection<K2, V>;
  public every<V2 extends V>(
    fn: (value: V, key: K, collection: this) => value is V2
  ): this is Collection<K, V2>;
  public every(fn: (value: V, key: K, collection: this) => unknown): boolean;
  public every<This, K2 extends K>(
    fn: (this: This, value: V, key: K, collection: this) => key is K2,
    thisArg: This
  ): this is Collection<K2, V>;
  public every<This, V2 extends V>(
    fn: (this: This, value: V, key: K, collection: this) => value is V2,
    thisArg: This
  ): this is Collection<K, V2>;
  public every<This>(
    fn: (this: This, value: V, key: K, collection: this) => unknown,
    thisArg: This
  ): boolean;
  public every(
    fn: (value: V, key: K, collection: this) => unknown,
    thisArg?: unknown
  ): boolean {
    if (typeof fn !== 'function')
      throw new TypeError(`${fn} is not a function`);
    if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
    for (const [key, val] of this) {
      if (!fn(val, key, this)) return false;
    }

    return true;
  }

  /**
   * Applies a function to produce a single value. Identical in behavior to
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce Array.reduce()}.
   *
   * @param fn - Function used to reduce, taking four arguments; `accumulator`, `currentValue`, `currentKey`,
   * and `collection`
   * @param initialValue - Starting value for the accumulator
   * @example
   * ```ts
   * collection.reduce((acc, guild) => acc + guild.memberCount, 0);
   * ```
   */
  public reduce<T>(
    fn: (accumulator: T, value: V, key: K, collection: this) => T,
    initialValue?: T
  ): T {
    if (typeof fn !== 'function')
      throw new TypeError(`${fn} is not a function`);
    let accumulator!: T;

    if (typeof initialValue !== 'undefined') {
      accumulator = initialValue;
      for (const [key, val] of this)
        accumulator = fn(accumulator, val, key, this);
      return accumulator;
    }

    let first = true;
    for (const [key, val] of this) {
      if (first) {
        accumulator = val as unknown as T;
        first = false;
        continue;
      }

      accumulator = fn(accumulator, val, key, this);
    }

    // No items iterated.
    if (first) {
      throw new TypeError('Reduce of empty collection with no initial value');
    }

    return accumulator;
  }

  /**
   * Identical to
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach Map.forEach()},
   * but returns the collection instead of undefined.
   *
   * @param fn - Function to execute for each element
   * @param thisArg - Value to use as `this` when executing function
   * @example
   * ```ts
   * collection
   *  .each(user => console.log(user.username))
   *  .filter(user => user.bot)
   *  .each(user => console.log(user.username));
   * ```
   */
  public each(fn: (value: V, key: K, collection: this) => void): this;
  public each<T>(
    fn: (this: T, value: V, key: K, collection: this) => void,
    thisArg: T
  ): this;
  public each(
    fn: (value: V, key: K, collection: this) => void,
    thisArg?: unknown
  ): this {
    if (typeof fn !== 'function')
      throw new TypeError(`${fn} is not a function`);
    // eslint-disable-next-line unicorn/no-array-method-this-argument
    this.forEach(fn as (value: V, key: K, map: Map<K, V>) => void, thisArg);
    return this;
  }

  /**
   * Creates an identical shallow copy of this collection.
   *
   * @example
   * ```ts
   * const newColl = someColl.clone();
   * ```
   */
  public clone(): Collection<K, V> {
    return new this.constructor[Symbol.species](this);
  }

  public toJSON() {
    // toJSON is called recursively by JSON.stringify.
    return [...this.values()];
  }
}
