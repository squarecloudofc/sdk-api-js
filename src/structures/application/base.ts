import type {
  APIUserApplication,
  ApplicationLanguage,
} from "@squarecloud/api-types/v2";
import { readFile } from "fs/promises";

import type { SquareCloudAPI } from "@/index";
import { assertPathLike, assertString } from "@/assertions/literal";
import { Routes } from "@/lib/routes";
import { BackupsModule, DeploysModule, FilesModule } from "@/modules";
import { ApplicationCacheService } from "@/services";
import { ApplicationStatus } from "@/structures";

import type { Application } from "./application";

/**
 * Represents the base application from the user endpoint
 */
export class BaseApplication {
  /** The application ID */
  public readonly id: string;
  /** The application display name */
  public name: string;
  /** The application description */
  public description?: string;
  /** The url to manage the application via web */
  public url: string;
  /** The application total ram */
  public ram: number;
  /** The application current cluster */
  public cluster: string;
  /**
   * The application programming language
   *
   * - `javascript`
   * - `typescript`
   * - `python`
   * - `java`
   * - `elixir`
   * - `rust`
   * - `go`
   * - `php`
   * - `dotnet`
   * - `static`
   */
  public language: ApplicationLanguage;

  /** Cache service for this application */
  public readonly cache = new ApplicationCacheService();
  /** Files module for this application */
  public readonly files = new FilesModule(this);
  /** Backup module for this application */
  public readonly backups = new BackupsModule(this);
  /** Deploys module for this application */
  public readonly deploys = new DeploysModule(this);

  /**
   * Represents the base application from the user endpoint
   *
   * @constructor
   * @param client - The client for this application
   * @param data - The data from this application
   */
  constructor(
    public readonly client: SquareCloudAPI,
    data: APIUserApplication,
  ) {
    const { id, name, desc, ram, lang, cluster } = data;

    this.id = id;
    this.name = name;
    this.description = desc;
    this.ram = ram;
    this.language = lang;
    this.cluster = cluster;
    this.url = `https://squarecloud.app/dashboard/app/${id}`;
  }

  /** @deprecated Use `Application#backups` instead */
  get backup() {
    console.warn(
      "[SquareCloudAPI] The 'backup' property is deprecated and will be removed in the the next major version. Use Application#backups instead.",
    );
    return this.backups;
  }

  /**
   * Fetches this application for full information
   */
  async fetch(): Promise<Application> {
    return this.client.applications.fetch(this.id);
  }

  /**
   * Gets the application current status information
   */
  async getStatus(): Promise<ApplicationStatus> {
    const data = await this.client.api.request(Routes.apps.status(this.id));
    const status = new ApplicationStatus(this.client, data.response, this.id);

    this.client.emit("statusUpdate", this, this.cache.status, status);
    this.cache.set("status", status);

    return status;
  }

  /**
   * Gets the application current logs
   */
  async getLogs(): Promise<string> {
    const data = await this.client.api.request(Routes.apps.logs(this.id));
    const { logs } = data.response;

    this.client.emit("logsUpdate", this, this.cache.logs, logs);
    this.cache.set("logs", logs);

    return logs;
  }

  /**
   * Starts up the application
   * @returns `boolean` for success or fail
   */
  async start(): Promise<boolean> {
    const data = await this.client.api.request(Routes.apps.start(this.id), {
      method: "POST",
    });

    return data?.status === "success";
  }

  /**
   * Stops the application
   * @returns `boolean` for success or fail
   */
  async stop(): Promise<boolean> {
    const data = await this.client.api.request(Routes.apps.stop(this.id), {
      method: "POST",
    });

    return data?.status === "success";
  }

  /**
   * Restarts the application
   * @returns `boolean` for success or fail
   */
  async restart(): Promise<boolean> {
    const data = await this.client.api.request(Routes.apps.restart(this.id), {
      method: "POST",
    });

    return data?.status === "success";
  }

  /**
   * Deletes your whole application
   * - This action is irreversible.
   *
   * @returns `boolean` for success or fail
   */
  async delete(): Promise<boolean> {
    const data = await this.client.api.request(Routes.apps.delete(this.id), {
      method: "DELETE",
    });

    return data?.status === "success";
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
   * - Tip 2: use a zip file to commit more than one archive
   *
   * @param file - Buffer or absolute path to the file
   * @param fileName - The file name (e.g.: "index.js")
   * @param restart - Whether the application should be restarted after the commit
   * @returns `true` for success or `false` for fail
   */
  async commit(file: string | Buffer, fileName?: string): Promise<boolean> {
    assertPathLike(file, "COMMIT_FILE");

    if (fileName) {
      assertString(fileName, "FILE_NAME");
    }

    if (typeof file === "string") {
      file = await readFile(file);
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file)]);
    formData.append("file", blob, fileName || "commit.zip");

    const data = await this.client.api.request(Routes.apps.commit(this.id), {
      method: "POST",
      body: formData,
    });

    return data?.status === "success";
  }
}
