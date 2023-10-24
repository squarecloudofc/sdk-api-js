import { Application, SquareCloudAPIError } from '../../structures';

export class ApplicationBackupManager {
  constructor(public readonly application: Application) {}

  /** @returns The generated backup URL */
  async url(): Promise<string> {
    const data = await this.application.client.api.application(
      'backup',
      this.application.id,
    );

    const backup = data.response.downloadURL;

    this.application.client.emit(
      'backupUpdate',
      this.application,
      this.application.cache.backup,
      backup,
    );
    this.application.cache.set('backup', backup);

    return backup;
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
