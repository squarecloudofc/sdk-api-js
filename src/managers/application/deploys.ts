import { validateString } from "@/assertions";
import { Application } from "@";

export class ApplicationDeploysManager {
  constructor(public readonly application: Application) {}

  /**
   * Integrates Square Cloud with GitHub webhooks
   *
   * @param accessToken - The access token for your GitHub repository. You can find this in your [GitHub Tokens Classic](https://github.com/settings/tokens/new)
   */
  async setGithubWebhook(accessToken: string) {
    validateString(accessToken);

    const data = await this.application.client.api.application("deploy/git-webhook", this.application.id, undefined, {
      method: "POST",
      body: JSON.stringify({ access_token: accessToken }),
    });

    return data.status === "success";
  }

  /**
   * Gets the last 10 deployments of an application from the last 24 hours
   */
  async list() {
    const data = await this.application.client.api.application("deploys/list", this.application.id);

    return data?.response;
  }
}
