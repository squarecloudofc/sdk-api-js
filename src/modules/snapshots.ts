import type { RESTPostAPISnapshotResult } from "@squarecloud/api-types/v2";

import { assertString } from "@/assertions/literal";
import { Routes } from "@/lib/routes";
import { type BaseApplication, SquareCloudAPIError } from "@/structures";
import { Snapshot } from "@/structures/snapshot";

export interface RestoreSnapshotOptions {
  /** Snapshot identifier (UUID v4) */
  snapshotId: string;
  /** Version identifier from the snapshot listing */
  versionId: string;
}

export class SnapshotsModule {
  constructor(public readonly application: BaseApplication) {}

  /**
   * Gets the list of generated snapshots for this application
   */
  async list(): Promise<Snapshot[]> {
    const data = await this.application.client.api.request(
      Routes.apps.snapshots(this.application.id),
    );

    const snapshots = data.response.map(
      (snapshot) => new Snapshot(this.application, snapshot),
    );

    this.application.client.emit(
      "snapshotsUpdate",
      this.application,
      this.application.cache.snapshots,
      snapshots,
    );
    this.application.cache.set("snapshots", snapshots);

    return snapshots;
  }

  /**
   * Generates a new snapshot
   * @returns The generated snapshot URL and key
   */
  async create(): Promise<RESTPostAPISnapshotResult> {
    const data = await this.application.client.api.request(
      Routes.apps.generateSnapshot(this.application.id),
      { method: "POST" },
    );

    return data.response;
  }

  /**
   * Generates a new snapshot and downloads it
   * @returns The downloaded snapshot buffer
   */
  async download(): Promise<Buffer> {
    const snapshot = await this.create();

    const res = await fetch(snapshot.url)
      .then((res) => res.arrayBuffer())
      .catch(() => undefined);

    if (!res) {
      throw new SquareCloudAPIError("SNAPSHOT_DOWNLOAD_FAILED");
    }

    return Buffer.from(res);
  }

  /**
   * Restores the application to a previous snapshot
   *
   * @param options - The snapshot identifiers
   * @returns `true` for success
   */
  async restore(options: RestoreSnapshotOptions): Promise<boolean> {
    assertString(options.snapshotId, "SNAPSHOT_ID");
    assertString(options.versionId, "VERSION_ID");

    const data = await this.application.client.api.request(
      Routes.apps.restoreSnapshot(this.application.id),
      { method: "POST", body: options },
    );

    return data?.status === "success";
  }
}
