import { readFile } from 'fs/promises';
import { join } from 'path';
import { validatePathLike, validateString } from '../assertions';
import {
  APIResponse,
  ApplicationFilesListResponse,
  ApplicationFilesReadResponse,
} from '../types';
import APIManager from './api';

export default class FilesManager {
  constructor(
    private readonly apiManager: APIManager,
    private readonly appId: string,
  ) {}

  /**  */
  async list(path: string = '/') {
    validateString(path, 'LIST_FILES_PATH');

    const { response } = <APIResponse<ApplicationFilesListResponse>>(
      await this.apiManager.application(`files/list?path=${path}`, this.appId)
    );

    return response;
  }

  async read(path: string) {
    validateString(path, 'READ_FILE_PATH');

    const { response } = <APIResponse<ApplicationFilesReadResponse>>(
      await this.apiManager.application(`files/read?path=${path}`, this.appId)
    );

    if (!response) {
      return;
    }
    return Buffer.from(response.data);
  }

  async create(file: string | Buffer, fileName: string, path: string = '/') {
    validatePathLike(file, 'CREATE_FILE');

    if (typeof file === 'string') {
      file = await readFile(file);
    }

    const { status } = await this.apiManager.application(
      `files/create`,
      this.appId,
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

  async delete(path: string) {
    validateString(path, 'DELETE_FILE_PATH');

    const { status } = await this.apiManager.application(
      `files/delete?path=${path}`,
      this.appId,
      'DELETE',
    );

    return status === 'success';
  }
}
