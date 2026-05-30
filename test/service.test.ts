import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SquareCloudAPI } from "../lib/src.mjs";

describe("ServiceModule", async () => {
  // Service status is public — no API key required. Use a placeholder so the
  // client constructor's assertion doesn't reject.
  const client = new SquareCloudAPI("public-placeholder-key-for-service-only");

  await it("should fetch platform status", async () => {
    const status = await client.service.status();

    assert.ok(status);
    assert.ok(typeof status.status === "string");
    assert.ok(typeof status.message === "string");
  });
});
