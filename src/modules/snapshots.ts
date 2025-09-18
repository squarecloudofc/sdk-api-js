import type { RESTPostAPISnapshotResult } from "@squarecloud/api-types/v2";

import { Routes } from "@/lib/routes";
import { type BaseApplication, SquareCloudAPIError } from "@/structures";
import { Snapshot } from "@/structures/snapshot";

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
}
