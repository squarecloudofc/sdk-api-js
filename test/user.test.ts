import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SquareCloudAPI } from "../lib/src.mjs";

describe("UserModule", async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

  await it("should get user information", async () => {
    const user = await client.user.get();

    assert.ok(user);
    assert.ok(user.id);
    assert.ok(typeof user.email === "string");
    assert.ok(typeof user.name === "string");
    assert.ok(user.applications);
    assert.ok(user.applications.size >= 0);
  });

  await it("should update cache on user fetch", async () => {
    const firstUser = await client.user.get();
    const cachedUser = client.cache.get("user");

    assert.strictEqual(cachedUser?.id, firstUser.id);
    assert.strictEqual(cachedUser?.email, firstUser.email);
  });

  await it("should emit userUpdate event", async () => {
    let emitted = false;
    const oldUser = client.cache.get("user");

    client.on("userUpdate", (oldUserEvent, newUserEvent) => {
      assert.strictEqual(oldUserEvent, oldUser);
      assert.ok(newUserEvent);
      emitted = true;
    });

    await client.user.get();
    assert.ok(emitted, "userUpdate event should have been emitted");
  });
});
