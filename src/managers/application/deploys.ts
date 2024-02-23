import { assertString } from "@/assertions/literal";
import { Application } from "@/index";

export class ApplicationDeploysManager {
	constructor(public readonly application: Application) {}

	/**
	 * Integrates Square Cloud with GitHub webhooks
	 *
	 * @param accessToken - The access token for your GitHub repository. You can find this in your [GitHub Tokens Classic](https://github.com/settings/tokens/new)
	 */
	async getGithubWebhook(accessToken: string) {
		assertString(accessToken);

		const data = await this.application.client.api.application(
			"deploy/git-webhook",
			this.application.id,
			undefined,
			{
				method: "POST",
				body: JSON.stringify({ access_token: accessToken }),
			},
		);

		return data.response.webhook;
	}

	/**
	 * Gets the last 10 deployments of an application from the last 24 hours
	 */
	async list() {
		const data = await this.application.client.api.application(
			"deploys/list",
			this.application.id,
		);

		return data?.response;
	}
}
