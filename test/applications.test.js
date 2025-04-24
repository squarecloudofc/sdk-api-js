import { readFile } from "fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout } from "node:timers/promises";
import path from "path";
import { fileURLToPath } from "url";
import { SquareCloudAPI } from "../lib/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("ApplicationsModule", async (t) => {
	const client = new SquareCloudAPI(process.env.SQUARE_API_KEY);

	await t.test("should list all applications", async () => {
		const applications = await client.applications.get();
		assert.ok(applications);
		assert.ok(applications.size >= 0);
	});

	await t.test("should handle application lifecycle", async (t) => {
		const testAppPath = path.join(__dirname, "fixtures/test-app.zip");
		const fileContent = await readFile(testAppPath);

		const createdApp = await client.applications.create(fileContent);

		await t.test("should create application", async () => {
			assert.ok(createdApp);
			assert.ok(createdApp.id);
		});

		const app = await client.applications.fetch(createdApp.id);

		await t.test("should fetch application", async () => {
			assert.strictEqual(app.id, createdApp.id);
		});

		await t.test("should get status", async () => {
			const status = await app.getStatus();
			assert.strictEqual(status.applicationId, createdApp.id);
		});

		await t.test("should get application logs", async () => {
			const logs = await app.getLogs();
			assert.ok(typeof logs === "string");
		});

		await t.test("should commit files to application", async () => {
			const testFilePath = path.join(__dirname, "fixtures/test-file.txt");
			const fileContent = await readFile(testFilePath);

			const bufferResult = await app.commit(fileContent, "test-file.txt");
			assert.strictEqual(bufferResult, true);

			await setTimeout(10000);

			const pathResult = await app.commit(testFilePath, "test-file2.txt");
			assert.strictEqual(pathResult, true);
		});

		await t.test("should start application", async () => {
			const result = await app.start();
			assert.strictEqual(result, true);
		});

		await t.test("should restart application", async () => {
			const result = await app.restart();
			assert.strictEqual(result, true);
		});

		await t.test("should stop application", async () => {
			const result = await app.stop();
			assert.strictEqual(result, true);
		});

		await t.test("should delete application", async () => {
			const deleteResult = await app.delete();
			assert.strictEqual(deleteResult, true);
		});
	});

	await t.test("should get status for all applications", async () => {
		const statuses = await client.applications.statusAll();
		assert.ok(Array.isArray(statuses));
	});
});
