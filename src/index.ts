import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { ApiManager, SquareCloudAPIError } from './ApiManager';
import { validatePathLike, validateString } from './Assertions';
import { Application } from './structures/Application';
import { FullUser, User } from './structures/User';

class SquareCloudAPI {
  static apiInfo = {
    version: 'v1',
    baseUrl: 'https://api.squarecloud.app/v1/public/',
  };

  public readonly apiManager: ApiManager;

  /**
   * Creates an API instance
   *
   * @param apiKey - Your API Token (generate at [Square Cloud Dashboard](https://squarecloud.app/dashboard))
   * @param customApiManager - Custom API manager. Just use if you know what you are doing!
   */
  constructor(
    apiKey: string,
    customApiManager?: new (apiKey: string) => ApiManager
  ) {
    validateString(apiKey, 'API_KEY');

    if (customApiManager && customApiManager instanceof ApiManager) {
      this.apiManager = new customApiManager(apiKey);
    } else {
      this.apiManager = new ApiManager(apiKey);
    }
  }

  /**
   * Gets a user's informations
   *
   * @param userId - The user ID, if not provided it will get your own information
   */
  async getUser(): Promise<FullUser>;
  async getUser(userId: string): Promise<User>;
  async getUser(userId?: string): Promise<User> {
    if (userId) {
      validateString(userId, 'USER_ID');
    }

    const data = await this.apiManager.user(userId);
    const hasAccess = data.user.email && data.user.email !== 'Access denied';

    return new (hasAccess ? FullUser : User)(this.apiManager, data);
  }

  /**
   * Returns an application that you can manage or get information
   *
   * @param appId - The application ID, you must own the application
   */
  async getApplication(appId: string): Promise<Application> {
    validateString(appId, 'APP_ID');

    const data = await this.apiManager.user();
    const applications = data.applications || [];
    const applicaton = applications.find((app) => app.id === appId);

    if (!applicaton) {
      throw new SquareCloudAPIError('APP_NOT_FOUND');
    }

    return new Application(this.apiManager, applicaton);
  }

  /**
   * Upload a new application to Square Cloud
   *
   * - Don't forget the [configuration file](https://config.squarecloud.app/).
   * - This only accepts .zip files.
   *
   * - Tip: use this to get an absolute path.
   * ```ts
   * require('path').join(__dirname, 'fileName')
   * ```
   *
   * @param file - Buffer or absolute path to the file
   *
   * @returns The uploaded application ID
   */
  async uploadApplication(file: string | Buffer) {
    validatePathLike(file, 'UPLOAD_DATA');

    if (typeof file === 'string') {
      file = await readFile(file);
    }

    const formData = new FormData();
    formData.append('file', file, { filename: 'app.zip' });

    const { app } = await this.apiManager.fetch('upload', {
      method: 'POST',
      body: formData.getBuffer(),
      headers: formData.getHeaders(),
    });

    return <string>app?.id;
  }
}

module.exports = Object.assign(SquareCloudAPI, { default: SquareCloudAPI });

export default SquareCloudAPI;
export { Application, FullUser, User, ApiManager as APIManager };
export * from './typings';
