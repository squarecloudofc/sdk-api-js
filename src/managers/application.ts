import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { validatePathLike, validateString } from '../assertions';
import Application from '../structures/application';
import Collection from '../structures/collection';
import { FullUser } from '../structures/user';
import { APIResponse, UploadedApplicationResponse } from '../types';
import APIManager from './api';

export default class ApplicationManager {
  constructor(private readonly apiManager: APIManager) {}

  /**
   * If the ID is provided, it will return an application that you can manage or get information
   * If the ID is not provided, it will return a collection of applications
   *
   * @param appId - The application ID, you must own the application
   */
  async get(): Promise<Collection<string, Application> | undefined>;
  async get(appId: string): Promise<Application | undefined>;
  async get(
    appId?: string
  ): Promise<Application | Collection<string, Application> | undefined> {
    const { response } = await this.apiManager.user();
    if (!response) {
      return;
    }

    const { applications } = new FullUser(this.apiManager, response);

    if (appId) {
      validateString(appId, 'APP_ID');
      return applications.get(appId);
    }
    return applications;
  }

  /**
   * Uploads an application
   *
   * @param file - The zip file path or Buffer
   * @returns The uploaded application data
   */
  async create(file: string | Buffer) {
    validatePathLike(file, 'COMMIT_DATA');

    if (typeof file === 'string') {
      file = await readFile(file);
    }

    const formData = new FormData();
    formData.append('file', file, { filename: 'app.zip' });

    const data = <APIResponse<UploadedApplicationResponse>>(
      await this.apiManager.fetch('apps/upload', {
        method: 'POST',
        body: formData.getBuffer(),
        headers: formData.getHeaders(),
      })
    );

    return data?.response?.app;
  }
}
