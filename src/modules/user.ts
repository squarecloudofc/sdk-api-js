import type { SnapshotScope } from "@squarecloud/api-types/v2";

import { Routes } from "@/lib/routes";
import { User } from "@/structures";

import type { SquareCloudAPI } from "..";

export class UserModule {
  constructor(public readonly client: SquareCloudAPI) {}

  /**
   * Gets the authenticated user information
   */
  async get(): Promise<User> {
    const { response } = await this.client.api.request(Routes.user());
    const user = new User(this.client, response);

    this.client.emit("userUpdate", this.client.cache.user, user);
    this.client.cache.set("user", user);

    return user;
  }

  /**
   * Lists the authenticated user's snapshots
   * - Requires a paid subscription
   *
   * @param scope - Snapshot domain (default: `applications`)
   */
  async snapshots(scope: SnapshotScope = "applications") {
    const { response } = await this.client.api.request(Routes.userSnapshots(), {
      query: { scope },
    });

    return response;
  }
}
