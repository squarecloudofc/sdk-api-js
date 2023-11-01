import { validateString } from "@/assertions";
import { WebsiteApplication } from "../..";

export class ApplicationNetworkManager {
  constructor(public readonly application: WebsiteApplication) {}

  /**
   * Changes the custom domain for your website application
   * - Requires Senior plan or higher
   *
   * @returns Whether the domain was changed or not
   */
  async setCustomDomain(domain: string) {
    validateString(domain, "CUSTOM_DOMAIN");
    const data = await this.application.client.api.application(
      `network/custom/${encodeURIComponent(domain)}`,
      this.application.id,
      undefined,
      "POST",
    );

    return data.status === "success";
  }

  /**
   * Gets analytics to your website application custom domain
   * - Requires Senior plan or higher
   * - Requires the app to have a configured custom domain
   */
  async analytics() {
    const data = await this.application.client.api.application("network/analytics", this.application.id);

    return data?.response;
  }
}
