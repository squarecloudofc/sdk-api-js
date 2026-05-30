import type {
  APIDatabaseCreated,
  DatabaseResetType,
  RESTPostAPIDatabaseJSONBody,
  RESTPostAPISnapshotResult,
} from "@squarecloud/api-types/v2";

import { assertNumber, assertString } from "@/assertions/literal";
import { Routes } from "@/lib/routes";
import {
  Database,
  SimpleDatabaseStatus,
  SquareCloudAPIError,
} from "@/structures";
import { DatabaseSnapshot } from "@/structures/snapshot";

import type { SquareCloudAPI } from "..";

export interface ResetDatabaseCredentialsResult {
  /** Present only when `reset: "password"`. */
  password?: string;
}

export class DatabasesModule {
  constructor(public readonly client: SquareCloudAPI) {}

  /**
   * Fetches a database that you can manage or get information from
   *
   * @param databaseId - The database ID, you must own the database
   */
  async fetch(databaseId: string): Promise<Database> {
    assertString(databaseId, "DATABASE_ID");

    const { response } = await this.client.api.request(
      Routes.databases.info(databaseId),
    );

    return new Database(this.client, response);
  }

  /**
   * Creates a new database
   * - Available only on Standard, Pro and Enterprise plans
   *
   * @param options - Database name, memory, type and version
   * @returns The created database. The `password` and `certificate` are
   *          shown only at creation time — store them securely.
   */
  async create(
    options: RESTPostAPIDatabaseJSONBody,
  ): Promise<APIDatabaseCreated> {
    assertString(options.name, "DATABASE_NAME");
    assertNumber(options.memory, "DATABASE_MEMORY");
    assertString(options.type, "DATABASE_TYPE");
    assertString(options.version, "DATABASE_VERSION");

    const { response } = await this.client.api.request(
      Routes.databases.create(),
      { method: "POST", body: options },
    );

    return response;
  }

  /**
   * Gets the summary status for every database owned by the caller
   */
  async statusAll(): Promise<SimpleDatabaseStatus[]> {
    const { response } = await this.client.api.request(
      Routes.databases.statusAll(),
    );

    return response.map(
      (status) => new SimpleDatabaseStatus(this.client, status),
    );
  }
}

export class DatabaseCredentialsModule {
  constructor(public readonly database: Database) {}

  /**
   * Downloads the TLS certificate for the database (base64-encoded PEM)
   * - The database must be running
   */
  async certificate(): Promise<string> {
    const { response } = await this.database.client.api.request(
      Routes.databases.credentials.certificate(this.database.id),
    );

    return response.certificate;
  }

  /**
   * Resets either the database password or the TLS certificate
   *
   * @param type - `"password"` returns the new password once; `"certificate"`
   *               returns success and the new certificate is fetched via
   *               {@link certificate}.
   */
  async reset(
    type: DatabaseResetType,
  ): Promise<ResetDatabaseCredentialsResult> {
    assertString(type, "RESET_TYPE");

    const data = await this.database.client.api.request(
      Routes.databases.credentials.reset(this.database.id),
      { method: "POST", body: { reset: type } },
    );

    if (type === "password") {
      return { password: data.response?.password };
    }

    return {};
  }
}

export class DatabaseSnapshotsModule {
  constructor(public readonly database: Database) {}

  /**
   * Lists the stored snapshots for this database
   */
  async list(): Promise<DatabaseSnapshot[]> {
    const { response } = await this.database.client.api.request(
      Routes.databases.snapshots.list(this.database.id),
    );

    return response.map(
      (snapshot) => new DatabaseSnapshot(this.database, snapshot),
    );
  }

  /**
   * Captures a snapshot of the database
   * @returns A signed download URL valid for 30 days
   */
  async create(): Promise<RESTPostAPISnapshotResult> {
    const { response } = await this.database.client.api.request(
      Routes.databases.snapshots.create(this.database.id),
      { method: "POST" },
    );

    return response;
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
   * Restores the database from a previous snapshot
   *
   * @param snapshotId - Snapshot identifier (UUID v4, optionally suffixed with `_<type>`)
   * @param versionId - Version identifier from the snapshot listing
   * @returns `true` for success
   */
  async restore(snapshotId: string, versionId: string): Promise<boolean> {
    assertString(snapshotId, "SNAPSHOT_ID");
    assertString(versionId, "VERSION_ID");

    const data = await this.database.client.api.request(
      Routes.databases.snapshots.restore(this.database.id),
      { method: "POST", body: { snapshotId, versionId } },
    );

    return data?.status === "success";
  }
}
