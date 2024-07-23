import { assertString } from "@/assertions/literal";
import type { WebsiteApplication } from "@/index";
import { Routes } from "@/lib/routes";

export class ApplicationNetworkManager {
	constructor(public readonly application: WebsiteApplication) {}

	/**
	 * Integrates your website with a custom domain
	 * - Requires [Senior plan](https://squarecloud.app/plans) or higher
	 *
	 * @param domain - The custom domain you want to use (e.g. yoursite.com)
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
	 * Gets analytics for a custom domain
	 * - Requires [Senior plan](https://squarecloud.app/plans) or higher
	 * - Requires the application to have an integrated custom domain
	 */
	async analytics() {
		const data = await this.application.client.api.request(
			Routes.apps.network.analytics(this.application.id),
		);

		return data?.response;
	}
}
