import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { ApiManager, SquareCloudAPIError } from './ApiManager';
import { validatePathLike, validateString } from './Assertions';
import { Application } from './structures/Application';
import { FullUser, User } from './structures/User';
import { Options } from './typings';

class SquareCloudAPI {
  static apiInfo = {
    version: 'v1',
    baseUrl: 'https://api.squarecloud.app/',
  };

  private apiManager: ApiManager;
  private experimental?: boolean;

  /**
   * Creates an API instance
   *
   * @param apiKey - Your API Token (generate at [Square Cloud Dashboard](https://squarecloud.app/dashboard))
   * @param options.customApiManager - Custom API manager. Just use if you know what you are doing!
   * @param options.experimental - Whether to enable experimental features
   */
  constructor(apiKey: string, options?: Options) {
    validateString(apiKey, 'API_KEY');

    this.apiManager = new ApiManager(apiKey);
    this.experimental = Boolean(options?.experimental);
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

    const data = await this.apiManager.fetch('upload', {
      method: 'POST',
      body: formData.getBuffer(),
      headers: formData.getHeaders(),
    });

    return <string>data?.app?.id;
  }

  /**
   * @experimental
   * Use the new Square Cloud experimental AI feature.
   * **May have bugs.**
   *
   * @param question - The question you want to be answered :)
   * @param prompt - Optional context or previous messages
   */
  async askAi(question: string, prompt?: string): Promise<string | undefined> {
    if (!this.experimental) {
      return;
    }

    const data = await this.apiManager.fetch(
      'ai',
      {
        method: 'POST',
        body: JSON.stringify({ question, prompt }),
      },
      'experimental'
    );

    return data?.response;
  }
}

module.exports = Object.assign(SquareCloudAPI, {
  default: SquareCloudAPI,
  ApiManager,
  Application,
  FullUser,
  User,
});

export default SquareCloudAPI;
export * from './typings';
export { ApiManager, Application, FullUser, User };

