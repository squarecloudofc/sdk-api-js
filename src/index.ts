import { validateString } from './assertions';
import APIManager from './managers/api';
import ApplicationManager from './managers/application';
import ExperimentalManager from './managers/experimental';
import UserManager from './managers/user';
import { APIOptions } from './types';

export class SquareCloudAPI<Ex extends boolean = boolean> {
  static apiInfo = {
    latestVersion: 'v2',
    baseUrl: 'https://api.squarecloud.app/',
  };

  public readonly api: APIManager;

  /** Use experimental features */
  public experimental: Ex extends true ? ExperimentalManager : undefined;
  /** The applications manager */
  public applications: ApplicationManager;
  /** The users manager */
  public users: UserManager;

  /**
   * Creates an API instance
   *
   * @param apiKey - Your API Token (generate at [Square Cloud Dashboard](https://squarecloud.app/dashboard))
   * @param options.experimental - Whether to enable experimental features
   */
  constructor(apiKey: string, options?: APIOptions<Ex>) {
    validateString(apiKey, 'API_KEY');

    this.experimental = (
      options?.experimental ? new ExperimentalManager(this) : undefined
    ) as Ex extends true ? ExperimentalManager : undefined;

    this.api = new APIManager(apiKey);
    this.applications = new ApplicationManager(this);
    this.users = new UserManager(this);
  }
}
