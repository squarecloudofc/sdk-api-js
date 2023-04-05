import {
  validateBoolean,
  validatePathLike,
  validateString,
} from '../Assertions';

import FormData from 'form-data';
import { readFile } from 'fs/promises';
import { BaseApiManager } from '../ApiManager';
import { ApplicationStatusData, RawApplicationData } from '../typings';

/**
 * Represents a SquareCloud application
 *
 * @constructor
 * @param apiManager - The APIManager for this application
 * @param data - The data from this application
 */
export class Application {
  /** The application ID */
  id: string;
  /** The application Discord tag */
  tag: string;
  /** The dashboard url to manage the application */
  url: string;
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

  #apiManager: BaseApiManager;

  constructor(apiManager: BaseApiManager, data: RawApplicationData) {
    this.id = data.id;
    this.tag = data.tag;
    this.ram = data.ram;
    this.lang = data.lang;
    this.type = data.type;
    this.avatar = data.avatar;
    this.cluster = data.cluster;
    this.isWebsite = data.isWebsite;

    this.#apiManager = apiManager;
    this.url = `https://squarecloud.app/dashboard/app/${data.id}`;
  }

  /** Gets the application's current information */
  async getStatus(): Promise<ApplicationStatusData> {
    const data = await this.#apiManager.application('status', this.id);

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
    } = data.response;

    return {
      status,
      running,
      network,
      requests,
      cpuUsage: cpu,
      ramUsage: ram,
      storageUsage: storage,
      uptimeTimestamp: uptime || 0,
      uptime: uptime ? new Date(uptime) : undefined,
      lastCheckTimestamp: time || 0,
      lastCheck: time ? new Date(time) : undefined,
    };
  }

  /** Gets the application logs
   *
   * @param full - Whether you want the complete logs (true) or the recent ones (false)
   */
  async getLogs(full: boolean = false): Promise<string> {
    validateBoolean(full, 'LOGS_FULL');

    const data = await this.#apiManager.application(
      `${full ? 'full-' : ''}logs`,
      this.id
    );

    return data?.response.logs;
  }

  /** Generates the backup download URL */
  async backup(): Promise<string> {
    const data = await this.#apiManager.application('backup', this.id);

    return data?.response.downloadURL;
  }

  /** Starts up the application */
  async start(): Promise<boolean> {
    const data = await this.#apiManager.application('start', this.id, true);

    return data?.code === 'ACTION_SENT';
  }

  /** Stops the application */
  async stop(): Promise<boolean> {
    const data = await this.#apiManager.application('stop', this.id, true);

    return data?.code === 'ACTION_SENT';
  }

  /** Restarts the application */
  async restart(): Promise<boolean> {
    const data = await this.#apiManager.application('restart', this.id, true);

    return data?.code === 'ACTION_SENT';
  }

  /**
   * Deletes your whole application
   *
   * - This action is irreversible.
   */
  async delete(): Promise<boolean> {
    const data = await this.#apiManager.application('delete', this.id, true);

    return data?.code === 'APP_DELETED';
  }

  /**
   * Commit changes to a specific file inside your application folder
   *
   * - This action is irreversible.
   *
   * - Tip: use this to get an absolute path.
   * ```ts
   * require('path').join(__dirname, 'fileName')
   * ```
   * - Tip2: use a zip file to commit more than one archive
   *
   * @param file - Buffer or absolute path to the file
   * @param fileName - The file name (e.g.: "index.js")
   * @param restart - Whether the application should be restarted after the commit
   */
  async commit(
    file: string | Buffer,
    fileName?: string,
    restart?: boolean
  ): Promise<boolean> {
    validatePathLike(file, 'COMMIT_DATA');

    if (fileName) {
      validateString(fileName, 'FILE_NAME');
    }

    if (typeof file === 'string') {
      file = await readFile(file);
    }

    const formData = new FormData();
    formData.append('file', file, { filename: fileName });

    const data = await this.#apiManager.application(
      'commit',
      `${this.id}?restart=${Boolean(restart)}`,
      {
        method: 'POST',
        body: formData.getBuffer(),
        headers: formData.getHeaders(),
      }
    );

    return data?.code === 'SUCCESS';
  }
}
