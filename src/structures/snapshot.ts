import type { APISnapshot } from "@squarecloud/api-types/v2";

import type { SquareCloudAPI } from "@/index";

import type { BaseApplication } from "./application/base";
import type { Database } from "./database";
import { SquareCloudAPIError } from "./error";

type SnapshotScope = "applications" | "databases";

abstract class BaseSnapshot {
  /** Size of the snapshot in bytes. */
  public size: number;

  /** Date of the last modification of the snapshot. */
  public modifiedAt: Date;

  /** Date of the last modification of the snapshot in milliseconds. */
  public modifiedTimestamp: number;

  /** Signed query string used to compose the snapshot download URL. */
  public readonly key: string;

  /** The URL for downloading this snapshot. Valid for 30 days. */
  public readonly url: string;

  constructor(client: SquareCloudAPI, data: APISnapshot, scope: SnapshotScope) {
    const { userId } = client.api;
    const { name, size, modified, key } = data;

    this.size = size;
    this.modifiedAt = new Date(modified);
    this.modifiedTimestamp = this.modifiedAt.getTime();
    this.key = key;
    this.url = `https://snapshots.squarecloud.app/${scope}/${userId}/${name}.zip?${key}`;
  }

  /**
   * Downloads this snapshot
   * @returns The downloaded snapshot buffer
   */
  async download(): Promise<Buffer> {
    const res = await fetch(this.url)
      .then((res) => res.arrayBuffer())
      .catch(() => undefined);

    if (!res) {
      throw new SquareCloudAPIError("SNAPSHOT_DOWNLOAD_FAILED");
    }

    return Buffer.from(res);
  }
}

/**
 * Represents an application snapshot
 */
export class Snapshot extends BaseSnapshot {
  /**
   * Represents an application snapshot
   *
   * @constructor
   * @param application - The application from which you fetched the snapshots
   * @param data - The data from this snapshot
   */
  constructor(
    public readonly application: BaseApplication,
    data: APISnapshot,
  ) {
    super(application.client, data, "applications");
  }
}

/**
 * Represents a database snapshot
 */
export class DatabaseSnapshot extends BaseSnapshot {
  /**
   * Represents a database snapshot
   *
   * @constructor
   * @param database - The database from which you fetched the snapshots
   * @param data - The data from this snapshot
   */
  constructor(
    public readonly database: Database,
    data: APISnapshot,
  ) {
    super(database.client, data, "databases");
  }
}

/**
 * @deprecated Use Snapshot instead.
 */
export class Backup extends Snapshot {}
