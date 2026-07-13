import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setTimeout } from "node:timers/promises";

import { SquareCloudAPI, SquareCloudAPIError } from "../lib/src.mjs";

const CREATE_SKIP_CODES = [
  "UPGRADE_REQUIRED",
  "SUBSCRIPTION_REQUIRED",
  "INSUFFICIENT_MEMORY",
  "FEW_MEMORY",
  "INVALID_DATABASE_VERSION",
  "DATABASE_VERSION_INVALID",
  "CLUSTER_MAINTENANCE_TRY_LATER",
];

const skip = !process.env.SQUARE_API_KEY
  ? "SQUARE_API_KEY is not set"
  : undefined;

describe("DatabasesModule", { skip }, async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

  await it("should list databases via user.get()", async () => {
    const user = await client.user.get();

    assert.ok(user.databases);
    assert.ok(user.databases.size >= 0);
  });

  await it("statusAll() should return SimpleDatabaseStatus[]", async () => {
    const statuses = await client.databases.statusAll();

    assert.ok(Array.isArray(statuses));

    for (const status of statuses) {
      assert.ok(typeof status.databaseId === "string");
      assert.strictEqual(typeof status.running, "boolean");
    }
  });

  await describe("Lifecycle", { skip }, async () => {
    let createdId: string | undefined;

    await it("should create a Redis database", async (t) => {
      try {
        const created = await client.databases.create({
          name: "sdk-test-db",
          memory: 256,
          type: "redis",
          version: "7.4.5",
        });

        assert.ok(created.id);
        assert.ok(created.password);
        assert.ok(created.connection_url);
        assert.strictEqual(created.type, "redis");

        createdId = created.id;
      } catch (err) {
        if (
          err instanceof SquareCloudAPIError &&
          CREATE_SKIP_CODES.includes(err.code)
        ) {
          t.skip(`Skipped: ${err.message}`);
        } else {
          throw err;
        }
      }
    });

    await it("should fetch the created database", async (t) => {
      if (!createdId) return t.skip("creation did not produce an id");

      const db = await client.databases.fetch(createdId);
      assert.strictEqual(db.id, createdId);
      assert.strictEqual(db.type, "redis");
      assert.ok(db.createdAt instanceof Date);
    });

    await it("should get status after a short wait", async (t) => {
      if (!createdId) return t.skip("creation did not produce an id");

      await setTimeout(2000);

      const db = await client.databases.fetch(createdId);
      const status = await db.getStatus();

      assert.ok(typeof status.status === "string");
      assert.strictEqual(typeof status.running, "boolean");
    });

    await it("should update name", async (t) => {
      if (!createdId) return t.skip("creation did not produce an id");

      const db = await client.databases.fetch(createdId);
      const result = await db.update({ name: "sdk-test-db-renamed" });

      assert.strictEqual(result, true);
      assert.strictEqual(db.name, "sdk-test-db-renamed");
    });

    await it("should delete the database", async (t) => {
      if (!createdId) return t.skip("creation did not produce an id");

      const db = await client.databases.fetch(createdId);
      const deleted = await db.delete();

      assert.strictEqual(deleted, true);
    });
  });

  await it("create() should reject invalid memory", async () => {
    await assert.rejects(
      () =>
        client.databases.create({
          name: "x",
          // @ts-expect-error — invalid memory shape on purpose
          memory: "256",
          type: "redis",
          version: "7.4.5",
        }),
      /Invalid Database Memory/,
    );
  });
});
