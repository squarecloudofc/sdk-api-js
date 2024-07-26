import { assertWebsiteApplication } from "@/assertions/application";
import type { SquareCloudAPI } from "@/index";
import { NetworkModule } from "@/modules";
import type { APIWebsiteApplication } from "@squarecloud/api-types/v2";
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
	/** Network module for this application */
	network = new NetworkModule(this);

	constructor(
		public readonly client: SquareCloudAPI,
		data: APIWebsiteApplication,
	) {
		assertWebsiteApplication(data);
		super(client, data);

		const { domain, custom } = data;

		this.domain = domain;
		this.custom = custom || undefined;
	}
}
