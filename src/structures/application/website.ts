import { Application, SquareCloudAPI } from "@";
import { APIWebsiteApplication } from "@squarecloud/api-types/v2";

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

  constructor(
    public readonly client: SquareCloudAPI,
    data: APIWebsiteApplication,
  ) {
    super(client, data);

    this.domain = data.domain;
    this.custom = data.custom || undefined;
  }
}
