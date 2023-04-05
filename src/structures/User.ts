import { ApiManager } from '../ApiManager';
import { AccountPlan, RawUserData } from '../typings';
import { Application } from './Application';
import { Collection } from './Collection';

/**
 * Represents a SquareCloud user
 *
 * @constructor
 * @param apiManager - The APIManager for this user
 * @param data - The data from this user
 */
export class User {
  /** The user's id */
  id: string;
  /** The user's Discord tag */
  tag: string;
  /** The user's locale */
  locale: string;
  /** The user's current plan */
  plan: AccountPlan;
  /** Whether the user is blocked for Square Cloud services or not */
  blocklist: boolean;
  /** @private API Manager */
  #apiManager: ApiManager;

  constructor(apiManager: ApiManager, data: RawUserData) {
    this.id = data.user.id;
    this.tag = data.user.tag;
    this.locale = data.user.locale;
    this.blocklist = data.user.blocklist;
    this.plan = {
      ...data.user.plan,
      duration: data.user.plan.duration.formatted,
      purchasedTimestamp: data.user.plan.duration.raw,
      purchased: data.user.plan.duration.raw
        ? new Date(data.user.plan.duration.raw)
        : undefined,
    };
    this.#apiManager = apiManager;
  }

  /** Whether you have access to private information or not */
  hasAccess(): this is FullUser {
    const email = Reflect.get(this, 'email');
    return email && email !== 'Access denied';
  }

  /** Fetches the user data again and returns a new User */
  fetch(): Promise<User> {
    return this.#apiManager
      .user(this.id)
      .then(
        (data) =>
          new (this.hasAccess() ? FullUser : User)(this.#apiManager, data)
      );
  }
}

export class FullUser extends User {
  /** The user's registered email */
  email: string;
  /** The user's registered applications Collection */
  applications: Collection<string, Application>;

  constructor(apiManager: ApiManager, data: RawUserData) {
    super(apiManager, data);

    this.email = data.user.email;
    this.applications = new Collection(
      data.applications.map((app) => [app.id, new Application(apiManager, app)])
    );
  }
}
