import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { type Application, SquareCloudAPI } from "../lib/src.mjs";

const skip = !process.env.SQUARE_API_KEY
  ? "SQUARE_API_KEY is not set"
  : undefined;

describe("DeploysModule", { skip }, async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

  let testApp: Application;

  before(async () => {
    const apps = await client.applications.get();
    testApp = apps.first() as Application;

    if (!testApp) {
      throw new Error("No test application found");
    }
  });

  await it("list() should return Deployment[][] (timelines per deploy)", async () => {
    const history = await testApp.deploys.list();

    assert.ok(Array.isArray(history));

    if (history.length === 0) return;

    for (const timeline of history) {
      assert.ok(Array.isArray(timeline), "each entry should be a timeline");

      // every event in a timeline shares the same id (commit SHA-1)
      const id = timeline[0]?.id;
      assert.ok(typeof id === "string");

      for (const event of timeline) {
        assert.strictEqual(event.id, id);
        assert.ok(event.createdAt instanceof Date);
        assert.ok(typeof event.state === "string");
      }
    }
  });

  await it("Deployment.branch is present only when state === 'clone'", async () => {
    const history = await testApp.deploys.list();

    for (const event of history.flat()) {
      if (event.state === "clone") {
        assert.ok(typeof event.branch === "string");
      } else {
        assert.strictEqual(event.branch, undefined);
      }
    }
  });

  await it("Deployment.files is present only when state === 'commit'", async () => {
    const history = await testApp.deploys.list();

    for (const event of history.flat()) {
      if (event.state === "commit") {
        assert.ok(event.files);
        assert.ok(Array.isArray(event.files.added));
        assert.ok(Array.isArray(event.files.removed));
        assert.ok(Array.isArray(event.files.modified));
      } else {
        assert.strictEqual(event.files, undefined);
      }
    }
  });

  await it("current() should return the deploy configuration", async () => {
    const current = await testApp.deploys.current();

    assert.ok(current);
    // Either `app` (GitHub App linkage) or `webhook` may be present
    if (current.webhook) {
      assert.ok(typeof current.webhook === "string");
      assert.ok(current.webhook.startsWith("https://"));
    }
  });

  await it("webhookURL() should match current().webhook", async () => {
    const [direct, current] = await Promise.all([
      testApp.deploys.webhookURL(),
      testApp.deploys.current(),
    ]);

    assert.strictEqual(direct, current.webhook);
  });
});
