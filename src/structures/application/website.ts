import { assertWebsiteApplication } from "@/assertions/application";
import { SquareCloudAPI } from "@/index";
import { ApplicationNetworkManager } from "@/managers";
import { APIWebsiteApplication } from "@squarecloud/api-types/v2";
import { Application } from "./application";

/**
 * Represents a Square Cloud application
 *
 * @constructor
 * @param client - The client for this application
 * @param data - The data from this application
 */
export class WebsiteApplication extends Application {
  /** The application default domain (e.g. example.squareweb.app) */
  domain: string;
  /** The custom configured domain (e.g. yoursite.com) */
  custom?: string;
  /** Network manager for this application */
  network = new ApplicationNetworkManager(this);

  constructor(
    public readonly client: SquareCloudAPI,
    data: APIWebsiteApplication,
  ) {
    super(client, data);
    assertWebsiteApplication(data);

    const { domain, custom } = data;

    this.domain = domain;
    this.custom = custom || undefined;
  }
}
