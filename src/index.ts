import { validateString } from './assertions';
import APIManager from './managers/api';
import ApplicationManager from './managers/application';
import ExperimentalManager from './managers/experimental';
import UserManager from './managers/user';
import { APIOptions } from './types';

export class SquareCloudAPI {
  static apiInfo = {
    latestVersion: 'v2',
    baseUrl: 'https://api.squarecloud.app/',
  };

  private apiManager: APIManager;

  /** Use experimental features */
  public experimental?: ExperimentalManager;
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
  constructor(apiKey: string, options?: APIOptions) {
    validateString(apiKey, 'API_KEY');

    this.apiManager = new APIManager(apiKey);
    this.experimental = options?.experimental
      ? new ExperimentalManager(this.apiManager)
      : undefined;
    this.applications = new ApplicationManager(this.apiManager);
    this.users = new UserManager(this.apiManager);
  }
}
