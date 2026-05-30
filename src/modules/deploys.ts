import type { APIGithubAppRepository } from "@squarecloud/api-types/v2";

import { assertString } from "@/assertions/literal";
import { Routes } from "@/lib/routes";
import { type BaseApplication, SquareCloudAPIError } from "@/structures";
import { Deployment } from "@/structures/deploy";

export interface LinkGithubAppOptions {
  /** Full repository name (e.g. `octocat/hello-world`) */
  repositoryName: string;
  /** Repository branch (max 256 chars) */
  repositoryBranch: string;
}

export class DeploysModule {
  constructor(public readonly application: BaseApplication) {}

  /**
   * Integrates Square Cloud with GitHub webhooks
   *
   * @param accessToken - The access token for your GitHub repository.
   *                      Pass `"@"` to remove the existing webhook.
   *                      You can find this in your [GitHub Tokens Classic](https://github.com/settings/tokens/new)
   */
  async integrateGithubWebhook(accessToken: string) {
    assertString(accessToken);

    const data = await this.application.client.api.request(
      Routes.apps.deployments.webhook(this.application.id),
      { method: "POST", body: { access_token: accessToken } },
    );

    return data.response?.webhook;
  }

  /**
   * Links a GitHub repository via the Square Cloud GitHub App
   * - Requires a session token (JWT). API keys are not accepted.
   *
   * @param options - The repository name and branch to link
   * @returns The linked repository information
   */
  async linkGithubApp(
    options: LinkGithubAppOptions,
  ): Promise<APIGithubAppRepository> {
    assertString(options.repositoryName, "REPOSITORY_NAME");
    assertString(options.repositoryBranch, "REPOSITORY_BRANCH");

    const { response } = await this.application.client.api.request(
      Routes.apps.deployments.githubApp.link(this.application.id),
      { method: "POST", body: options },
    );

    if (!response) {
      throw new SquareCloudAPIError("GITHUB_APP_LINK_FAILED");
    }

    return response.repository;
  }

  /**
   * Unlinks the GitHub App repository from the application
   * - Requires a session token (JWT). API keys are not accepted.
   *
   * @returns `true` for success
   */
  async unlinkGithubApp(): Promise<boolean> {
    const data = await this.application.client.api.request(
      Routes.apps.deployments.githubApp.unlink(this.application.id),
      { method: "DELETE" },
    );

    return data?.status === "success";
  }

  /**
   * Gets the application's deploy history.
   *
   * Returns one inner timeline per deploy — each inner array shares the same
   * `id` (commit SHA-1) and walks through `pending → clone → commit →
   * restarting → success | error`. Flatten with `.flat()` if you want a
   * single chronological list of events.
   */
  async list(): Promise<Deployment[][]> {
    const data = await this.application.client.api.request(
      Routes.apps.deployments.list(this.application.id),
    );

    return data.response.map((timeline) =>
      timeline.map((event) => new Deployment(this.application, event)),
    );
  }

  /**
   * Gets the current webhook URL (legacy webhook deploys).
   * Returns `undefined` when no webhook is configured.
   */
  async webhookURL() {
    const data = await this.application.client.api.request(
      Routes.apps.deployments.current(this.application.id),
    );

    return data.response.webhook;
  }

  /**
   * Gets the current Git deploy configuration (GitHub App linkage + webhook).
   */
  async current() {
    const { response } = await this.application.client.api.request(
      Routes.apps.deployments.current(this.application.id),
    );

    return response;
  }
}
