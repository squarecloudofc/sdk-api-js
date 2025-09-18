import type { APISnapshot } from "@squarecloud/api-types/v2";

import type { BaseApplication } from "./application/base";

/**
 * Represents an application snapshot
 */
export class Snapshot {
  /** Size of the snapshot in bytes. */
  public size: number;

  /** Date of the last modification of the snapshot. */
  public modifiedAt: Date;

  /** Date of the last modification of the snapshot in millisseconds. */
  public modifiedTimestamp: number;

  /** AWS access key for the snapshot. */
  public readonly key: string;

  /** The URL for downloading this snapshot */
  public readonly url: string;

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
    const { name, size, modified, key } = data;
    const { userId } = application.client.api;

    this.size = size;
    this.modifiedAt = new Date(modified);
    this.modifiedTimestamp = this.modifiedAt.getTime();
    this.key = key;
    this.url = `https://snapshots.squarecloud.app/applications/${userId}/${name}.zip?${key}`;
  }

  /**
   * Downloads this snapshot
   * @returns The downloaded snapshot bufer
   */
  async download(): Promise<Buffer> {
    const res = await fetch(this.url)
      .then((res) => res.arrayBuffer())
      .catch(() => undefined);

    if (!res) {
      throw new Error("SNAPSHOT_DOWNLOAD_FAILED");
    }

    return Buffer.from(res);
  }
}

/**
 * @deprecated Use Snapshot instead.
 */
export class Backup extends Snapshot {}
