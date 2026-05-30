import type {
  APIApplication,
  APIWebsiteApplication,
} from "@squarecloud/api-types/v2";

import type { SquareCloudAPI } from "@/index";

import type { WebsiteApplication } from "./website";
import { BaseApplication } from "./base";

/**
 * Represents a Square Cloud application
 */
export class Application extends BaseApplication {
  /**
   * Represents a Square Cloud application
   *
   * @constructor
   * @param client - The client for this application
   * @param data - The data from this application
   */
  constructor(
    public readonly client: SquareCloudAPI,
    data: APIApplication,
  ) {
    const website = data as Partial<APIWebsiteApplication>;

    super(client, {
      ...data,
      lang: data.language,
      domain: website.domain ?? null,
      custom: website.custom ?? null,
    });
  }

  isWebsite(): this is WebsiteApplication {
    return this.domain !== null;
  }
}
