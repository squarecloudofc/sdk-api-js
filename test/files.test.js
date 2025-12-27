import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { SquareCloudAPI } from "../lib/index.mjs";

describe("FilesModule", async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY);

  /** @type {import("../lib").Application} */
  let testApp;

  before(async () => {
    const apps = await client.applications.get();
    testApp = apps.first();

    if (!testApp) {
      throw new Error("No test application found");
    }
  });

  await it("should list files in root directory", async () => {
    const files = await testApp.files.list();
    assert.ok(Array.isArray(files));
    if (files.length > 0) {
      const file = files[0];
      assert.ok(["file", "directory"].includes(file.type));
      assert.ok(typeof file.name === "string");
      if (file.type === "file") {
        assert.ok(typeof file.size === "number");
        assert.ok(typeof file.lastModified === "number");
      }
    }
  });

  await it("should create and read file", async () => {
    const testContent = "test content";
    const fileName = "test.txt";

    const createResult = await testApp.files.create(
      Buffer.from(testContent),
      fileName,
    );
    assert.strictEqual(createResult, true);

    const fileContent = await testApp.files.read(`/${fileName}`);
    assert.ok(Buffer.isBuffer(fileContent));
    assert.strictEqual(fileContent?.toString(), testContent);
  });

  await it("should edit existing file", async () => {
    const newContent = "updated content";
    const fileName = "test.txt";

    const editResult = await testApp.files.edit(
      Buffer.from(newContent),
      `/${fileName}`,
    );
    assert.strictEqual(editResult, true);

    const fileContent = await testApp.files.read(`/${fileName}`);
    assert.strictEqual(fileContent?.toString(), newContent);
  });

  await it("should move/rename file", async () => {
    const oldPath = "/test.txt";
    const newPath = "/test2.txt";

    const moveResult = await testApp.files.move(oldPath, newPath);
    assert.strictEqual(moveResult, true);

    const files = await testApp.files.list();
    assert.ok(files.some((file) => file.name === "test2.txt"));
  });

  await it("should handle non-existent file read", async () => {
    const content = await testApp.files.read("/non-existent.txt");
    assert.ok(content.byteLength === 0);
  });

  await it("should delete file", async () => {
    const deleteResult = await testApp.files.delete("/test2.txt");
    assert.strictEqual(deleteResult, true);

    const files = await testApp.files.list();
    assert.ok(!files.some((file) => file.name === "test2.txt"));
  });

  await it("should handle directory operations", async () => {
    await testApp.files.create(Buffer.from("file1"), "file1.txt", "/testdir");
    await testApp.files.create(Buffer.from("file2"), "file2.txt", "/testdir");

    const dirContents = await testApp.files.list("/testdir");
    assert.strictEqual(dirContents.length, 2);
    assert.ok(dirContents.some((file) => file.name === "file1.txt"));
    assert.ok(dirContents.some((file) => file.name === "file2.txt"));

    const deleteResult = await testApp.files.delete("/testdir");
    assert.strictEqual(deleteResult, true);

    const rootContents = await testApp.files.list();
    assert.ok(!rootContents.some((file) => file.name === "testdir"));
  });
});
