import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { validatePathLike, validateString } from '../assertions';
import Application from '../structures/application';
import { APIResponse, UploadedApplicationResponse } from '../types';
import APIManager from './api';

export default class ApplicationManager {
  constructor(private readonly apiManager: APIManager) {}

  /**
   * Returns an application that you can manage or get information
   *
   * @param appId - The application ID, you must own the application
   */
  async get(appId: string) {
    validateString(appId, 'APP_ID');

    const { response: user } = await this.apiManager.user();
    const data = user?.applications.find((app) => app.id === appId);

    if (!data) {
      return;
    }
    return new Application(this.apiManager, data);
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
