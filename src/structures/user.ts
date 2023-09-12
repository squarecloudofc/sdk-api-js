/* eslint-disable no-redeclare */
/* eslint-disable import/export */

import APIManager from '../managers/api';
import { UserResponse } from '../types';
import { UserPlanData } from '../types/user';
import Application from './application';
import Collection from './collection';

/**
 * Represents a Square Cloud user
 *
 * @constructor
 * @param apiManager - The APIManager for this user
 * @param data - The data from this user
 */
export default class User {
  /** The user's id */
  id: string;
  /** The user's Discord tag */
  tag: string;
  /** The user's locale */
  locale: string;
  /** The user's current plan */
  plan: UserPlanData;
  /** Whether the user is blocked for Square Cloud services or not */
  blocklist: boolean;

  constructor(data: UserResponse) {
    this.id = data.user.id;
    this.tag = data.user.tag;
    this.locale = data.user.locale;
    this.blocklist = data.user.blocklist;
    this.plan = {
      ...data.user.plan,
      duration: data.user.plan.duration.formatted,
      expiresTimestamp: data.user.plan.duration.raw,
      expires: data.user.plan.duration.raw
        ? new Date(data.user.plan.duration.raw)
        : undefined,
    };
  }

  /** Whether you have access to private information or not */
  hasAccess(): this is FullUser {
    const email = Reflect.get(this, 'email');
    return email && email !== 'Access denied';
  }
}

/**
 * Represents a Square Cloud user
 *
 * @constructor
 * @param apiManager - The APIManager for this user
 * @param data - The data from this user
 */
export class FullUser extends User {
  /** The user's registered email */
  email: string;
  /** The user's registered applications Collection */
  applications: Collection<string, Application>;

  constructor(apiManager: APIManager, data: UserResponse) {
    super(data);

    this.email = data.user.email!;
    this.applications = new Collection(
      data.applications.map((app) => [
        app.id,
        new Application(apiManager, app),
      ]),
    );
  }
}

export default interface User {
  /** The user's id */
  id: string;
  /** The user's Discord tag */
  tag: string;
  /** The user's locale */
  locale: string;
  /** The user's current plan */
  plan: UserPlanData;
  /** Whether the user is blocked for Square Cloud services or not */
  blocklist: boolean;
  /** Whether you have access to private information or not */
  hasAccess(): this is FullUser;
}
