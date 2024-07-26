import { assertString } from "@/assertions/literal";
import type { BaseApplication } from "@/index";
import { Routes } from "@/lib/routes";

export class ApplicationDeploysManager {
	constructor(public readonly application: BaseApplication) {}

	/**
	 * Integrates Square Cloud with GitHub webhooks
	 *
	 * @param accessToken - The access token for your GitHub repository. You can find this in your [GitHub Tokens Classic](https://github.com/settings/tokens/new)
	 */
	async integrateGithubWebhook(accessToken: string) {
		assertString(accessToken);

		const data = await this.application.client.api.request(
			Routes.apps.deployments.webhook(this.application.id),
			{ method: "POST", body: { access_token: accessToken } },
		);

		return data.response.webhook;
	}

	/**
	 * Gets the last 10 deployments of an application from the last 24 hours
	 */
	async list() {
		const data = await this.application.client.api.request(
			Routes.apps.deployments.list(this.application.id),
		);

		return data?.response;
	}

	/**
	 * Gets the current deployment URL
	 */
	async current() {
		const data = await this.application.client.api.request(
			Routes.apps.deployments.current(this.application.id),
		);

		return data?.response;
	}
}
