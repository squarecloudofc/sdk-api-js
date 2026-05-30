import type {
  APIDatabase,
  APIDatabaseSummary,
  APIMetrics,
  DatabaseType,
  RESTPatchAPIDatabaseJSONBody,
} from "@squarecloud/api-types/v2";

import type { SquareCloudAPI } from "@/index";
import { Routes } from "@/lib/routes";
import {
  DatabaseCredentialsModule,
  DatabaseSnapshotsModule,
} from "@/modules/databases";

import { ApplicationStatus } from "./status";

/**
 * Represents a Square Cloud database
 */
export class Database {
  /** The database ID */
  public readonly id: string;
  /** The database display name */
  public name: string;
  /** The database owner ID */
  public readonly owner?: string;
  /** The database current cluster */
  public cluster: string;
  /** The database allocated memory in MB */
  public ram: number;
  /** The database engine slug */
  public readonly type: DatabaseType | string;
  /** The TCP port the database listens on */
  public readonly port?: number;
  /** The date the database was created */
  public createdAt: Date;

  /** Credentials module for this database */
  public readonly credentials: DatabaseCredentialsModule;
  /** Snapshots module for this database */
  public readonly snapshots: DatabaseSnapshotsModule;

  constructor(
    public readonly client: SquareCloudAPI,
    data: APIDatabase | APIDatabaseSummary,
  ) {
    this.id = data.id;
    this.name = data.name;
    this.ram = data.ram;
    this.cluster = data.cluster;
    this.type = data.type;
    this.createdAt = new Date(data.created_at);

    if ("owner" in data) {
      this.owner = data.owner;
    }

    if ("port" in data) {
      this.port = data.port;
    }

    this.credentials = new DatabaseCredentialsModule(this);
    this.snapshots = new DatabaseSnapshotsModule(this);
  }

  /**
   * Fetches this database for full information
   */
  async fetch(): Promise<Database> {
    return this.client.databases.fetch(this.id);
  }

  /**
   * Gets the current runtime status (CPU, RAM, network, uptime)
   */
  async getStatus(): Promise<ApplicationStatus> {
    const { response } = await this.client.api.request(
      Routes.databases.status(this.id),
    );

    return new ApplicationStatus(this.client, response, this.id);
  }

  /**
   * Gets the last 24h of metrics (288 points sampled every 5 minutes)
   */
  async getMetrics(): Promise<APIMetrics> {
    const { response } = await this.client.api.request(
      Routes.databases.metrics(this.id),
    );

    return response;
  }

  /**
   * Starts the database
   * @returns `true` for success
   */
  async start(): Promise<boolean> {
    const data = await this.client.api.request(
      Routes.databases.start(this.id),
      { method: "POST" },
    );

    return data?.status === "success";
  }

  /**
   * Stops the database
   * @returns `true` for success
   */
  async stop(): Promise<boolean> {
    const data = await this.client.api.request(Routes.databases.stop(this.id), {
      method: "POST",
    });

    return data?.status === "success";
  }

  /**
   * Updates the database's display name or allocated memory
   *
   * @param options - At least one of `name` or `ram` must be provided
   * @returns `true` for success
   */
  async update(options: RESTPatchAPIDatabaseJSONBody): Promise<boolean> {
    const data = await this.client.api.request(
      Routes.databases.update(this.id),
      { method: "PATCH", body: options },
    );

    if (data?.status === "success") {
      if (options.name) this.name = options.name;
      if (options.ram) this.ram = options.ram;
      return true;
    }

    return false;
  }

  /**
   * Deletes the database
   * - This action is irreversible.
   *
   * @returns `true` for success
   */
  async delete(): Promise<boolean> {
    const data = await this.client.api.request(
      Routes.databases.delete(this.id),
      { method: "DELETE" },
    );

    return data?.status === "success";
  }
}
