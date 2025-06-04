import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import { SquareCloudAPI } from "../lib/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("ApplicationsModule", async () => {
	const client = new SquareCloudAPI(process.env.SQUARE_API_KEY);

	await it("should list all applications", async () => {
		const applications = await client.applications.get();
		assert.ok(applications);
		assert.ok(applications.size >= 0);
	});

	await describe("Lifecycle", async (t) => {
		const testAppPath = path.join(__dirname, "fixtures/test-app.zip");
		const fileContent = await readFile(testAppPath);

		const createdApp = await client.applications.create(fileContent);

		await it("should create application", async () => {
			assert.ok(createdApp);
			assert.ok(createdApp.id);
		});

		const app = await client.applications.fetch(createdApp.id);

		await it("should fetch application", async () => {
			assert.strictEqual(app.id, createdApp.id);
		});

		await it("should get status", async () => {
			const status = await app.getStatus();
			assert.strictEqual(status.applicationId, createdApp.id);
		});

		await it("should get application logs", async () => {
			const logs = await app.getLogs();
			assert.ok(typeof logs === "string");
		});

		const testFilePath = path.join(__dirname, "fixtures/test-file.txt");

		await it("should commit file to application", async () => {
			const pathResult = await app.commit(testFilePath, "test-file.txt");
			assert.strictEqual(pathResult, true);
		});

		await it("should stop application", async () => {
			const result = await app.stop();
			assert.strictEqual(result, true);
		});

		await it("should start application", async () => {
			const result = await app.start();
			assert.strictEqual(result, true);
		});

		await it("should restart application", async () => {
			const result = await app.restart();
			assert.strictEqual(result, true);
		});

		await it("should delete application", async () => {
			const deleteResult = await app.delete();
			assert.strictEqual(deleteResult, true);
		});
	});

	await it("should get status for all applications", async () => {
		const statuses = await client.applications.statusAll();
		assert.ok(Array.isArray(statuses));
	});
});
