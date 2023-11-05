import { SquareCloudAPI } from "@/index";
import { APIUserApplication, APIWebsiteApplication, ApplicationLanguage } from "@squarecloud/api-types/v2";
import { Application } from "./application";
import { WebsiteApplication } from "./website";

/**
 * Represents the base application from the user endpoint
 *
 * @constructor
 * @param client - The client for this application
 * @param data - The data from this application
 */
export class BaseApplication {
  id: string;
  tag: string;
  description?: string | undefined;
  url: string;
  ram: number;
  /**
   * The application programming language
   *
   * - `javascript`
   * - `typescript`
   * - `python`
   * - `java`
   * - `elixir`
   * - `rust`
   * - `go`
   * - `php`
   */
  language: ApplicationLanguage;
  cluster: string;
  isWebsite: boolean;
  avatar: string;

  constructor(
    public readonly client: SquareCloudAPI,
    data: APIUserApplication,
  ) {
    this.id = data.id;
    this.tag = data.tag;
    this.description = data.desc;
    this.ram = data.ram;
    this.language = data.lang;
    this.cluster = data.cluster;
    this.isWebsite = data.isWebsite;
    this.avatar = data.avatar;
    this.url = `https://squarecloud.app/dashboard/app/${data.id}`;
  }

  async fetch() {
    const data = await this.client.api.application("", this.id);

    if (data.response.isWebsite) {
      return new WebsiteApplication(this.client, data.response as APIWebsiteApplication);
    }
    return new Application(this.client, data.response);
  }
}
