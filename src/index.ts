import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { APIManager, SquareCloudAPIError } from './APIManager';
import { validatePathLike, validateString } from './Assertions';
import { Application } from './structures/Application';
import { FullUser, User } from './structures/User';

class SquareCloudAPI {
  static apiInfo = {
    version: 'v1',
    baseUrl: 'https://api.squarecloud.app/v1/public/',
  };

  public readonly apiManager: APIManager;

  /**
   * Creates an API instance
   *
   * @param apiKey - Your API Token (you can get it at [SquareCloud Dashboard](https://squarecloud.app/dashboard))
   */
  constructor(apiKey: string) {
    validateString(apiKey, 'API_KEY');

    this.apiManager = new APIManager(apiKey);
  }

  /**
   * Gets a user's informations
   *
   * @param userId - The user ID, if not provided it will get your own information
   */
  async getUser(): Promise<FullUser>;
  async getUser(userId: string): Promise<User>;
  async getUser(userId?: string): Promise<User> {
    if (userId) validateString(userId, 'USER_ID');

    const userData = await this.apiManager.user(userId);
    const hasAccess = userData.user.email !== 'Access denied';

    return new (hasAccess ? FullUser : User)(this.apiManager, userData);
  }

  /**
   * Returns an application that you can manage or get information
   *
   * @param appId - The application ID, you must own the application
   */
  async getApplication(appId: string): Promise<Application> {
    validateString(appId, 'APP_ID');

    const userData = await this.apiManager.user();
    const applications = userData.applications || [];

    const appData = applications.find((app) => app.id === appId);

    if (!appData) {
      throw new SquareCloudAPIError('APP_NOT_FOUND');
    }

    return new Application(this.apiManager, appData);
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

    if (!(file instanceof Buffer)) {
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
export type { Application, FullUser, User };
export type * from './typings';
