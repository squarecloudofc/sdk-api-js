import type { APIWebsiteApplication } from "@squarecloud/api-types/v2";

import type { SquareCloudAPI } from "@/index";
import { NetworkModule } from "@/modules";

import { Application } from "./application";

/**
 * Represents a Square Cloud website application — an `Application` with a
 * non-null `domain`. Refined from {@link Application} via {@link Application.isWebsite}.
 */
export class WebsiteApplication extends Application {
  /** The application default domain (e.g. example.squareweb.app) */
  public override domain: string;

  /** Network module for this application */
  public readonly network = new NetworkModule(this);

  /**
   * Represents a Square Cloud website application
   *
   * @constructor
   * @param client - The client for this application
   * @param data - The data from this application
   */
  constructor(
    public readonly client: SquareCloudAPI,
    data: APIWebsiteApplication,
  ) {
    super(client, data);
    this.domain = data.domain;
  }
}
