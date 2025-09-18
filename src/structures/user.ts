import type { APIUserInfo } from "@squarecloud/api-types/v2";

import type { UserPlan } from "@/types/user";

import type { SquareCloudAPI } from "..";
import { BaseApplication } from "./application/base";
import { Collection } from "./collection";

/**
 * Represents a Square Cloud user
 */
export class User {
  /** The user's id */
  public readonly id: string;
  /** The user's display name */
  public name: string;
  /** The user's current plan */
  public plan: UserPlan;
  /** The user's registered email */
  public email: string;
  /** The user's registered applications Collection */
  public applications: Collection<string, BaseApplication>;

  /**
   * Represents a Square Cloud user
   *
   * @constructor
   * @param client - The client for this user
   * @param data - The data from this user
   */
  constructor(client: SquareCloudAPI, data: APIUserInfo) {
    const { user, applications } = data;
    const { id, name, plan, email } = user;
    const { duration } = plan;

    this.id = id;
    this.name = name;
    this.email = email;
    this.plan = {
      ...plan,
      expiresInTimestamp: duration ?? undefined,
      expiresIn: duration ? new Date(duration) : undefined,
    };
    this.applications = new Collection(
      applications.map((app) => [app.id, new BaseApplication(client, app)]),
    );
  }
}
