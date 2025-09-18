import type { APIApplication } from "@squarecloud/api-types/v2";

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
    super(client, { ...data, lang: data.language });
  }

  isWebsite(): this is WebsiteApplication {
    const domain = Reflect.get(this, "domain");
    return Boolean(domain);
  }
}
