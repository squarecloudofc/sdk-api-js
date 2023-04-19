import { validateString } from './assertions';
import APIManager from './managers/api';
import { APIOptions } from './types';

export class SquareCloudAPI {
  static apiInfo = {
    latestVersion: 'v2',
    baseUrl: 'https://api.squarecloud.app/',
  };

  private apiManager: APIManager;
  private experimental?: boolean;

  /**
   * Creates an API instance
   *
   * @param apiKey - Your API Token (generate at [Square Cloud Dashboard](https://squarecloud.app/dashboard))
   * @param options.experimental - Whether to enable experimental features
   */
  constructor(apiKey: string, options?: APIOptions) {
    validateString(apiKey, 'API_KEY');

    this.apiManager = new APIManager(apiKey);
    this.experimental = Boolean(options?.experimental);
  }
}
