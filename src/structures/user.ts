import { SquareCloudAPI } from '..';
import { UserResponse } from '../types';
import { UserPlanData } from '../types/user';
import Application from './application';
import Collection from './collection';

/**
 * Represents a Square Cloud user
 *
 * @constructor
 * @param client - The client for this user
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
  /** The user's registered email */
  email: string;
  /** The user's registered applications Collection */
  applications: Collection<string, Application>;

  constructor(client: SquareCloudAPI, data: UserResponse) {
    this.id = data.user.id;
    this.tag = data.user.tag;
    this.locale = data.user.locale;
    this.plan = {
      ...data.user.plan,
      expiresTimestamp: data.user.plan.duration,
      expires: data.user.plan.duration
        ? new Date(data.user.plan.duration)
        : undefined,
    };
    this.email = data.user.email;
    this.applications = new Collection(
      data.applications.map((app) => [app.id, new Application(client, app)]),
    );
  }
}
