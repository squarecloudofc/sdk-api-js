import { validateString } from './assertions';
import APIManager from './managers/api';
import ApplicationManager from './managers/application';
import UserManager from './managers/user';

export class SquareCloudAPI {
  static apiInfo = {
    latestVersion: 'v2',
    baseUrl: 'https://api.squarecloud.app/',
  };

  public readonly api: APIManager;

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
  constructor(apiKey: string) {
    validateString(apiKey, 'API_KEY');
    this.api = new APIManager(apiKey);

    this.applications = new ApplicationManager(this);
    this.users = new UserManager(this);
  }
}
