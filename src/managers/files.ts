import { readFile } from 'fs/promises';
import { join } from 'path';
import { SquareCloudAPI } from '..';
import { validatePathLike, validateString } from '../assertions';

export default class FilesManager {
  constructor(
    public readonly client: SquareCloudAPI,
    private readonly appId: string,
  ) {}

  /**
   * Lists the files inside a directory
   *
   * @param path - The absolute directory path
   */
  async list(path: string = '/') {
    validateString(path, 'LIST_FILES_PATH');

    const { response } = await this.client.api.application(
      'files/list',
      this.appId,
      { path },
    );

    return response;
  }

  /**
   * Reads the specified file content
   *
   * @param path - The absolute file path
   */
  async read(path: string) {
    validateString(path, 'READ_FILE_PATH');

    const { response } = await this.client.api.application(
      'files/read',
      this.appId,
      { path },
    );

    if (!response) {
      return;
    }

    return Buffer.from(response.data);
  }

  /**
   * Creates a new file
   *
   * @param file - The file content
   * @param fileName - The file name with extension
   * @param path - The absolute file path
   */
  async create(file: string | Buffer, fileName: string, path: string = '/') {
    validatePathLike(file, 'CREATE_FILE');

    if (typeof file === 'string') {
      file = await readFile(file);
    }

    const { status } = await this.client.api.application(
      'files/create',
      this.appId,
      undefined,
      {
        method: 'POST',
        body: JSON.stringify({
          buffer: file.toJSON(),
          path: join(path, fileName),
        }),
      },
    );

    return status === 'success';
  }

  /**
   * Deletes the specified file or directory
   *
   * @param path - The absolute file or directory path
   */
  async delete(path: string) {
    validateString(path, 'DELETE_FILE_PATH');

    const { status } = await this.client.api.application(
      'files/delete',
      this.appId,
      { path },
      'DELETE',
    );

    return status === 'success';
  }
}
