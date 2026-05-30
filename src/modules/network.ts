import type {
  APINetworkErrors,
  APINetworkLogs,
  APINetworkPerformance,
} from "@squarecloud/api-types/v2";

import type { WebsiteApplication } from "@/structures";
import { assertString } from "@/assertions/literal";
import { Routes } from "@/lib/routes";

export interface NetworkRangeOptions {
  /** ISO 8601 start timestamp */
  start: string | Date;
  /** ISO 8601 end timestamp */
  end: string | Date;
}

export interface NetworkErrorsOptions extends NetworkRangeOptions {
  /** Include 4xx alongside 5xx (default: false, 5xx only) */
  include4xx?: boolean;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export class NetworkModule {
  constructor(public readonly application: WebsiteApplication) {}

  /**
   * Integrates your website with a custom domain
   * - Requires [Senior plan](https://squarecloud.app/plans) or higher
   *
   * @param custom - The custom domain you want to use (e.g. yoursite.com).
   *                 Pass `"@"` to remove the existing custom domain.
   */
  async setCustomDomain(custom: string) {
    assertString(custom, "CUSTOM_DOMAIN");
    const data = await this.application.client.api.request(
      Routes.apps.network.custom(this.application.id),
      { method: "POST", body: { custom } },
    );

    return data.status === "success";
  }

  /**
   * Gets aggregated edge analytics for the application's domains
   * - Maximum retention window is 7 days
   *
   * @param options - The time window (start/end as ISO 8601 strings or Date)
   */
  async analytics(options: NetworkRangeOptions) {
    const data = await this.application.client.api.request(
      Routes.apps.network.analytics(this.application.id),
      { query: { start: toIso(options.start), end: toIso(options.end) } },
    );

    return data?.response;
  }

  /**
   * Get the DNS records for your custom domain.
   */
  async dns() {
    const data = await this.application.client.api.request(
      Routes.apps.network.dns(this.application.id),
    );

    return data?.response;
  }

  /**
   * Gets the aggregated edge error breakdown for the application's domains
   * - Defaults to 5xx only. Pass `include4xx: true` to include 4xx as well.
   *
   * @param options - The time window and optional 4xx flag
   */
  async errors(
    options: NetworkErrorsOptions,
  ): Promise<APINetworkErrors | Record<string, never>> {
    const { response } = await this.application.client.api.request(
      Routes.apps.network.errors(this.application.id),
      {
        query: {
          start: toIso(options.start),
          end: toIso(options.end),
          ...(options.include4xx ? { include_4xx: "true" as const } : {}),
        },
      },
    );

    return response;
  }

  /**
   * Gets the per-request edge logs for the application's domains
   * - Requires [Pro plan](https://squarecloud.app/plans) or higher
   *
   * @param options - The time window
   */
  async logs(options: NetworkRangeOptions): Promise<APINetworkLogs> {
    const { response } = await this.application.client.api.request(
      Routes.apps.network.logs(this.application.id),
      { query: { start: toIso(options.start), end: toIso(options.end) } },
    );

    return response;
  }

  /**
   * Gets edge and origin latency percentiles (p50/p95/p99) for the application's domains
   * - Requires [Pro plan](https://squarecloud.app/plans) or higher
   *
   * @param options - The time window
   */
  async performance(
    options: NetworkRangeOptions,
  ): Promise<APINetworkPerformance | Record<string, never>> {
    const { response } = await this.application.client.api.request(
      Routes.apps.network.performance(this.application.id),
      { query: { start: toIso(options.start), end: toIso(options.end) } },
    );

    return response;
  }

  /**
   * Purges the edge cache for the given paths on the application's domains.
   * Pass an empty array `[]` to purge everything.
   *
   * @param paths - Specific paths to purge (e.g. `["/index.html", "/assets/app.css"]`)
   * @returns `true` for success
   */
  async purgeCache(paths: string[] = []): Promise<boolean> {
    const data = await this.application.client.api.request(
      Routes.apps.network.purgeCache(this.application.id),
      { method: "POST", body: { paths } },
    );

    return data?.status === "success";
  }
}
