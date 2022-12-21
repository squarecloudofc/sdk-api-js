import {
  validateString,
  validateBoolean,
  validateCommitLike,
} from '../Assertions';

import { RawApplicationData, ApplicationStatusData } from '../typings';
import { createReadStream, ReadStream } from 'fs';
import { APIManager } from '../APIManager';
import FormData from 'form-data';

/**
 * Represents a SquareCloud application
 *
 * @constructor
 * @param apiManager - The APIManager for this application
 * @param data - The data from this application
 */
export class Application {
  /** The application id */
  id: string;
  /** The application Discord tag */
  tag: string;
  /** The application total ram */
  ram: number;
  /**
   * The application programming language
   *
   * - 'javascript'
   * - 'typescript'
   * - 'python'
   * - 'java'
   */
  lang: 'javascript' | 'typescript' | 'python' | 'java';
  /** The application plan type (free' or 'paid') */
  type: 'free' | 'paid';
  /** The application avatar URL */
  avatar: string;
  /** The application current cluster */
  cluster: string;
  /** Whether the application is a website or not */
  isWebsite: boolean;

  #apiManager: APIManager;

  constructor(apiManager: APIManager, data: RawApplicationData) {
    this.id = data.id;
    this.tag = data.tag;
    this.ram = data.ram;
    this.lang = data.lang;
    this.type = data.type;
    this.avatar = data.avatar;
    this.cluster = data.cluster;
    this.isWebsite = data.isWebsite;

    this.#apiManager = apiManager;
  }

  /** Gets the application's current information */
  async getStatus(): Promise<ApplicationStatusData> {
    const {
      network,
      cpu,
      ram,
      storage,
      requests,
      running,
      status,
      uptime,
      time,
    } = (await this.#apiManager.application('status', this.id)).response;

    return {
      status,
      running,
      network,
      requests,
      cpuUsage: cpu,
      ramUsage: ram,
      storageUsage: storage,
      uptimeTimestamp: uptime || 0,
      uptime: uptime ? new Date(uptime) : null,
      lastCheckTimestamp: time,
      lastCheck: time ? new Date(time) : undefined,
    };
  }

  /** Gets the application logs
   *
   * @param full - Whether you want the complete logs (true) or the recent ones (false)
   */
  async getLogs(full: boolean = false): Promise<string> {
    validateBoolean(full, '[LOGS_FULL]');

    return (
      await this.#apiManager.application(`${full ? 'full-' : ''}logs`, this.id)
    ).response.logs;
  }

  /** Generates the backup download URL */
  async backup(): Promise<string> {
    return (await this.#apiManager.application('backup', this.id)).response
      .downloadURL;
  }

  /** Starts up the application */
  async start(): Promise<boolean> {
    const { code } = await this.#apiManager.application('start', this.id, true);

    return code === 'ACTION_SENT';
  }

  /** Stops the application */
  async stop(): Promise<boolean> {
    const { code } = await this.#apiManager.application('stop', this.id, true);

    return code === 'ACTION_SENT';
  }

  /** Restarts the application */
  async restart(): Promise<boolean> {
    const { code } = await this.#apiManager.application(
      'restart',
      this.id,
      true
    );

    return code === 'ACTION_SENT';
  }

  /**
   * Deletes your whole application
   *
   * - This action is irreversible.
   */
  async delete(): Promise<boolean> {
    const { code } = await this.#apiManager.application(
      'delete',
      this.id,
      true
    );

    return code === 'APP_DELETED';
  }

  /**
   * Commit changes to a specific file inside your application folder
   *
   * - This action is irreversible.
   * - Tip: use this to get an absolute path.
   * ```ts
   * require('path').join(__dirname, 'fileName')
   * ```
   * - Tip2: use zip file to commit more than one file
   *
   * @param file - The absolute file path, a Buffer or a ReadStream
   * @param fileName - If a Buffer is provided you must provide the file name and extension too
   */
  async commit(file: string | ReadStream): Promise<boolean>;
  async commit(file: Buffer, fileName: string): Promise<boolean>;
  async commit(
    file: string | ReadStream | Buffer,
    fileName?: string
  ): Promise<boolean> {
    validateCommitLike(file, 'COMMIT_DATA');

    const formData = new FormData();

    if (file instanceof Buffer) {
      validateString(fileName, 'FILE_NAME');

      formData.append('file', file, { filename: fileName });
    } else {
      formData.append(
        'file',
        file instanceof ReadStream ? file : createReadStream(file)
      );
    }

    const { code } = await this.#apiManager.application('commit', this.id, {
      method: 'POST',
      data: formData.getBuffer(),
      headers: formData.getHeaders(),
    });

    return code === 'SUCCESS';
  }
}
