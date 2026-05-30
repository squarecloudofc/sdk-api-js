import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { type Application, SquareCloudAPI } from "../lib/src.mjs";
import { waitForRunning } from "./_helpers.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const skip = !process.env.SQUARE_API_KEY
  ? "SQUARE_API_KEY is not set"
  : undefined;

describe("EnvsModule", { skip }, async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

  let testApp: Application;

  before(async () => {
    const zip = await readFile(path.join(__dirname, "fixtures/test-app.zip"));
    const created = await client.applications.create(zip);
    testApp = await client.applications.fetch(created.id);
    await waitForRunning(testApp, { settleMs: 10_000 });
  });

  after(async () => {
    if (testApp) await testApp.delete();
  });

  const TEST_KEY = "__SDK_TEST_VAR__";
  const TEST_VALUE = "hello-world";

  await it("list() on a fresh app should return {}", async () => {
    const envs = await testApp.envs.list();

    assert.ok(envs);
    assert.strictEqual(typeof envs, "object");
    assert.ok(!Array.isArray(envs));
  });

  await it("should merge variables via set() (auto-seeds .env on fresh app)", async () => {
    const envs = await testApp.envs.set({ [TEST_KEY]: TEST_VALUE });

    assert.ok(envs);
    assert.strictEqual(envs[TEST_KEY], TEST_VALUE);
  });

  await it("should return the env var via list()", async () => {
    const envs = await testApp.envs.list();

    assert.ok(envs);
    assert.strictEqual(envs[TEST_KEY], TEST_VALUE);
  });

  await it("should delete a specific key via delete()", async () => {
    const remaining = await testApp.envs.delete([TEST_KEY]);

    assert.ok(remaining);
    assert.strictEqual(remaining[TEST_KEY], undefined);
  });

  await it("should overwrite full set via replace()", async () => {
    const envs = await testApp.envs.replace({ OVERRIDE: "1" });

    assert.ok(envs);
    assert.strictEqual(envs.OVERRIDE, "1");
    assert.strictEqual(envs[TEST_KEY], undefined);
  });

  await it("should be a plain { key: string } object map", async () => {
    const envs = await testApp.envs.list();

    assert.strictEqual(typeof envs, "object");
    assert.ok(!Array.isArray(envs));

    for (const [key, value] of Object.entries(envs)) {
      assert.strictEqual(typeof key, "string");
      assert.strictEqual(typeof value, "string");
    }
  });
});
