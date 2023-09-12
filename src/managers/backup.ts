import SquareCloudAPIError from '../structures/error';
import { APIResponse, ApplicationBackupResponse } from '../types';
import APIManager from './api';

export default class BackupManager {
  readonly #apiManager: APIManager;
  private readonly appId: string;

  constructor(apiManager: APIManager, appId: string) {
    this.#apiManager = apiManager;
    this.appId = appId;
  }

  /** @returns The generated backup URL */
  async url(): Promise<string> {
    const data = <APIResponse<ApplicationBackupResponse>>(
      await this.#apiManager.application('backup', this.appId)
    );

    return data.response.downloadURL;
  }

  /** @returns The generated backup buffer */
  async download(): Promise<Buffer> {
    const url = await this.url();

    const registryUrl = url.replace(
      'https://squarecloud.app/dashboard/backup/',
      'https://registry.squarecloud.app/v1/backup/download/',
    );

    const res = await fetch(registryUrl)
      .then((res) => res.arrayBuffer())
      .catch(() => undefined);

    if (!res) {
      throw new SquareCloudAPIError('BACKUP_DOWNLOAD_FAILED');
    }

    return Buffer.from(res);
  }
}
