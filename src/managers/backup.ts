import { SquareCloudAPI } from '..';
import SquareCloudAPIError from '../structures/error';

export default class BackupManager {
  constructor(
    public readonly client: SquareCloudAPI,
    private readonly appId: string,
  ) {}

  /** @returns The generated backup URL */
  async url(): Promise<string> {
    const data = await this.client.api.application('backup', this.appId);

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
