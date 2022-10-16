import { RawApplicationData, ApplicationStatusData } from '../typings';
import { createReadStream, readFileSync, statSync } from 'fs';
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

  constructor(private apiManager: APIManager, data: RawApplicationData) {
    this.id = data.id;
    this.tag = data.tag;
    this.ram = data.ram;
    this.lang = data.lang;
    this.type = data.type;
    this.avatar = data.avatar;
    this.cluster = data.cluster;
    this.isWebsite = data.isWebsite;
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
    } = (await this.apiManager.application('status', this.id)).response;

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
  async getLogs(full: boolean = false) {
    return (
      await this.apiManager.application(`${full ? 'full-' : ''}logs`, this.id)
    ).response.logs;
  }

  /** Generates the backup download URL */
  async backup(): Promise<string> {
    return (await this.apiManager.application('backup', this.id)).response
      .downloadURL;
  }

  /** Starts up the application */
  async start(): Promise<boolean> {
    const { code } = await this.apiManager.application('start', this.id, true);

    return code === 'ACTION_SENT';
  }

  /** Stops the application */
  async stop(): Promise<boolean> {
    const { code } = await this.apiManager.application('stop', this.id, true);

    return code === 'ACTION_SENT';
  }

  /** Restarts the application */
  async restart(): Promise<boolean> {
    const { code } = await this.apiManager.application(
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
    const { code } = await this.apiManager.application('delete', this.id, true);

    return code === 'APP_DELETED';
  }

  /**
   * Commit changes to a specific file inside your application folder
   *
   * - This action is irreversible.
   * - Tip: use `require('path').join(__dirname, 'fileName')` to get an absolute path.
   *
   * @param filePath - The absolute file path
   */
  async commit(filePath: string): Promise<boolean> {
    const formData = new FormData();

    formData.append('file', createReadStream(filePath));

    const { code } = await this.apiManager.application('commit', this.id, {
      method: 'POST',
      data: formData,
      headers: { ...formData.getHeaders() },
    });

    return code === 'SUCCESS';
  }
}
