import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SquareCloudAPI } from "../lib/src.mjs";

const skip = !process.env.SQUARE_API_KEY
  ? "SQUARE_API_KEY is not set"
  : undefined;

describe("WorkspacesModule", { skip }, async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

  await it("should list workspaces", async () => {
    const workspaces = await client.workspaces.list();
    assert.ok(Array.isArray(workspaces));
  });

  await it("should expose memberList/applicationList raw data + members/applications modules", async () => {
    const workspaces = await client.workspaces.list();
    if (workspaces.length === 0) return;

    const ws = workspaces[0];

    assert.ok(Array.isArray(ws.memberList));
    assert.ok(Array.isArray(ws.applicationList));

    assert.strictEqual(typeof ws.members.add, "function");
    assert.strictEqual(typeof ws.members.update, "function");
    assert.strictEqual(typeof ws.members.remove, "function");

    assert.strictEqual(typeof ws.applications.add, "function");
    assert.strictEqual(typeof ws.applications.remove, "function");
  });

  await it("create() validates the name", async () => {
    await assert.rejects(
      // @ts-expect-error — empty body on purpose
      () => client.workspaces.create({}),
      /Invalid Workspace Name/,
    );
  });

  await describe("Lifecycle", { skip }, async () => {
    let createdId: string | undefined;

    await it("should create a workspace", async (t) => {
      try {
        const { id, name } = await client.workspaces.create({
          name: "sdk-test-ws",
        });

        assert.ok(id);
        assert.strictEqual(name, "sdk-test-ws");

        createdId = id;
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("Upgrade Required") ||
            err.message.includes("Workspace Limit Reached"))
        ) {
          t.skip(`Skipped: ${err.message}`);
        } else {
          throw err;
        }
      }
    });

    await it("should fetch the workspace", async (t) => {
      if (!createdId) return t.skip("creation did not produce an id");

      const ws = await client.workspaces.fetch(createdId);
      assert.strictEqual(ws.id, createdId);
      assert.ok(ws.createdAt instanceof Date);
    });

    await it("should generate an invite code", async (t) => {
      if (!createdId) return t.skip("creation did not produce an id");

      try {
        const code = await client.workspaces.generateInviteCode();
        assert.ok(typeof code === "string");
        assert.ok(code.length > 0);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "KEEP_CALM" || code === "RATE_LIMIT_EXCEEDED") {
          return t.skip("invite code endpoint is rate limited right now");
        }
        throw err;
      }
    });

    await it("should delete the workspace", async (t) => {
      if (!createdId) return t.skip("creation did not produce an id");

      const deleted = await client.workspaces.delete(createdId);
      assert.strictEqual(deleted, true);
    });
  });
});
