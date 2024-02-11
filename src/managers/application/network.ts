import { assertString } from "@/assertions/literal";
import { WebsiteApplication } from "@/index";

export class ApplicationNetworkManager {
	constructor(public readonly application: WebsiteApplication) {}

	/**
	 * Integrates your website with a custom domain
	 * - Requires [Senior plan](https://squarecloud.app/plans) or higher
	 *
	 * @param domain - The custom domain you want to use (e.g. yoursite.com)
	 */
	async setCustomDomain(domain: string) {
		assertString(domain, "CUSTOM_DOMAIN");
		const data = await this.application.client.api.application(
			`network/custom/${encodeURIComponent(domain)}`,
			this.application.id,
			undefined,
			"POST",
		);

		return data.status === "success";
	}

	/**
	 * Gets analytics for a custom domain
	 * - Requires [Senior plan](https://squarecloud.app/plans) or higher
	 * - Requires the application to have an integrated custom domain
	 */
	async analytics() {
		const data = await this.application.client.api.application(
			"network/analytics",
			this.application.id,
		);

		return data?.response;
	}
}
