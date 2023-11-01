import { BaseApplication, Collection, SquareCloudAPI } from "@";
import { UserPlan } from "@/types/user";
import { APIUserInfo } from "@squarecloud/api-types/v2";

/**
 * Represents a Square Cloud user
 *
 * @constructor
 * @param client - The client for this user
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
  plan: UserPlan;
  /** The user's registered email */
  email: string;
  /** The user's registered applications Collection */
  applications: Collection<string, BaseApplication>;

  constructor(client: SquareCloudAPI, data: APIUserInfo) {
    this.id = data.user.id;
    this.tag = data.user.tag;
    this.locale = data.user.locale;
    this.plan = {
      ...data.user.plan,
      expiresInTimestamp: data.user.plan.duration ?? undefined,
      expiresIn: data.user.plan.duration ? new Date(data.user.plan.duration) : undefined,
    };
    this.email = data.user.email;
    this.applications = new Collection(data.applications.map((app) => [app.id, new BaseApplication(client, app)]));
  }
}
