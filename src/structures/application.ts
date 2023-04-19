import FormData from 'form-data';
import { readFile } from 'fs/promises';
import {
  validateBoolean,
  validatePathLike,
  validateString,
} from '../assertions';
import APIManager from '../managers/api';
import {
  APIResponse,
  ApplicationBackupResponse,
  ApplicationLanguage,
  ApplicationLogsResponse,
  ApplicationStatusResponse,
  ApplicationTier,
  Application as ApplicationType,
} from '../types';
import { ApplicationStatusData } from '../types/application';
import FilesManager from '../managers/files';

/**
 * Represents a Square Cloud application
 *
 * @constructor
 * @param apiManager - The APIManager for this application
 * @param data - The data from this application
 */
export default class Application {
  /** The application Id */
  id: string;
  /** The application display name */
  tag: string;
  /** The url to manage the application via web */
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
   * - 'rust'
   * - 'go'
   */
  lang: ApplicationLanguage;
  /** The application plan tier ('free' or 'paid') */
  tier: ApplicationTier;
  /** The application avatar URL */
  avatar: string;
  /** The application current cluster */
  cluster: string;
  /** Whether the application is a website or not */
  isWebsite: boolean;
  /** Files manager for this application */
  files: FilesManager;

  constructor(private readonly apiManager: APIManager, data: ApplicationType) {
    this.id = data.id;
    this.tag = data.tag;
    this.ram = data.ram;
    this.lang = data.lang;
    this.tier = data.type;
    this.avatar = data.avatar;
    this.cluster = data.cluster;
    this.isWebsite = data.isWebsite;
    this.url = `https://squarecloud.app/dashboard/app/${data.id}`;
    this.files = new FilesManager(apiManager, data.id);
  }

  /** @returns The application current status information */
  async getStatus(): Promise<ApplicationStatusData> {
    const data = <APIResponse<ApplicationStatusResponse>>(
      await this.apiManager.application('status', this.id)
    );

    const {
      network,
      cpu: cpuUsage,
      ram: ramUsage,
      storage: storageUsage,
      requests,
      running,
      status,
      uptime,
      time,
    } = data.response!;

    return {
      status,
      running,
      network,
      requests,
      cpuUsage,
      ramUsage,
      storageUsage,
      uptimeTimestamp: uptime || 0,
      uptime: uptime ? new Date(uptime) : undefined,
      lastCheckTimestamp: time || 0,
      lastCheck: time ? new Date(time) : undefined,
    };
  }

  /**
   * @param full - Whether you want the complete logs (true) or the recent ones (false)
   * @returns The application logs
   */
  async getLogs(full?: boolean): Promise<string> {
    validateBoolean(full, 'LOGS_FULL');

    const data = <APIResponse<ApplicationLogsResponse>>(
      await this.apiManager.application(`${full ? 'full-' : ''}logs`, this.id)
    );

    return data.response?.logs!;
  }

  /** @returns A backup download URL */
  async backup(): Promise<string> {
    const data = <APIResponse<ApplicationBackupResponse>>(
      await this.apiManager.application('backup', this.id)
    );

    return data.response?.downloadURL!;
  }

  /**
   * Starts up the application
   * @returns `true` for success or `false` for fail
   */
  async start(): Promise<boolean> {
    const data = await this.apiManager.application('start', this.id, 'POST');

    return data?.code === 'ACTION_SENT';
  }

  /**
   * Stops the application
   * @returns `true` for success or `false` for fail
   */
  async stop(): Promise<boolean> {
    const data = await this.apiManager.application('stop', this.id, 'POST');

    return data?.code === 'ACTION_SENT';
  }

  /**
   * Restarts the application
   * @returns `true` for success or `false` for fail
   */
  async restart(): Promise<boolean> {
    const data = await this.apiManager.application('restart', this.id, 'POST');

    return data?.code === 'ACTION_SENT';
  }

  /**
   * Deletes your whole application
   *
   * - This action is irreversible.
   * @returns `true` for success or `false` for fail
   */
  async delete(): Promise<boolean> {
    const data = await this.apiManager.application('delete', this.id, 'DELETE');

    return data?.code === 'APP_DELETED';
  }

  /**
   * Commit files to your application folder
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
   * @returns `true` for success or `false` for fail
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
    formData.append('file', file, { filename: fileName || 'app.zip' });

    const data = await this.apiManager.application(
      `commit?restart=${Boolean(restart)}`,
      this.id,
      {
        method: 'POST',
        body: formData.getBuffer(),
        headers: formData.getHeaders(),
      }
    );

    return data?.code === 'SUCCESS';
  }
}
