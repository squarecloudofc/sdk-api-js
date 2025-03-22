import type { APIWebsiteApplication } from "@squarecloud/api-types/v2";

import type { SquareCloudAPI } from "@/index";
import { NetworkModule } from "@/modules";
import { Application } from "./application";

/**
 * Represents a Square Cloud application
 */
export class WebsiteApplication extends Application {
	/** The application default domain (e.g. example.squareweb.app) */
	public domain: string;
	/** The custom configured domain (e.g. yoursite.com) */
	public custom?: string;

	/** Network module for this application */
	public readonly network = new NetworkModule(this);

	/**
	 * Represents a Square Cloud application
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

		const { domain, custom } = data;

		this.domain = domain;
		this.custom = custom || undefined;
	}
}
