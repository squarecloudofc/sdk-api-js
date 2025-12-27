import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { SquareCloudAPI } from "../lib/index.mjs";

describe("SnapshotsModule", async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY);

  /** @type {import("../lib/index.js").Application} */
  let testApp;

  before(async () => {
    const apps = await client.applications.get();
    testApp = apps.first();

    if (!testApp) {
      throw new Error("No test application found");
    }
  });

  await it("should create snapshot", async (t) => {
    try {
      const snapshot = await testApp.snapshots.create();
      assert.ok(snapshot.url);
      assert.ok(snapshot.key);
    } catch (err) {
      if (err.message.includes("Rate Limit Exceeded")) {
        t.skip("Rate limit exceeded");
      }
    }
  });

  await it("should download snapshot", async () => {
    const snapshots = await testApp.snapshots.list();
    const buffer = await snapshots[0].download();
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  });

  await it("should list snapshots", async () => {
    const snapshots = await testApp.snapshots.list();

    assert.ok(Array.isArray(snapshots));
    if (snapshots.length > 0) {
      assert.ok(snapshots[0].url);
      assert.ok(snapshots[0].size);
      assert.ok(snapshots[0].modifiedAt);
    }
  });

  await it("should update cache on snapshots list", async () => {
    const snapshots = await testApp.snapshots.list();
    const cachedSnapshots = testApp.cache.get("snapshots");

    assert.deepStrictEqual(cachedSnapshots, snapshots);
  });

  await it("should emit snapshotsUpdate event", async () => {
    let emitted = false;
    const oldSnapshots = testApp.cache.get("snapshots");

    client.on(
      "snapshotsUpdate",
      (app, oldSnapshotsEvent, newSnapshotsEvent) => {
        assert.strictEqual(app, testApp);
        assert.deepStrictEqual(oldSnapshotsEvent, oldSnapshots);
        assert.ok(Array.isArray(newSnapshotsEvent));
        emitted = true;
      },
    );

    await testApp.snapshots.list();
    assert.ok(emitted, "snapshotsUpdate event should have been emitted");
  });
});
