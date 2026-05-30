import type { APIServiceStatus } from "@squarecloud/api-types/v2";

import { Routes } from "@/lib/routes";

import type { SquareCloudAPI } from "..";

export class ServiceModule {
  constructor(public readonly client: SquareCloudAPI) {}

  /**
   * Gets the aggregate platform status (mirrors the public status page).
   * Intended for lightweight health probes and dashboards.
   *
   * Note: this endpoint does not wrap its payload in the usual
   * `{ status, response }` envelope — it returns `{ status, message }` directly.
   */
  async status(): Promise<APIServiceStatus> {
    const data = await this.client.api.request(Routes.service.status());

    return data as unknown as APIServiceStatus;
  }
}
