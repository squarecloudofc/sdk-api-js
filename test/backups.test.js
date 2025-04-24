import assert from "node:assert/strict";
import test from "node:test";
import { SquareCloudAPI } from "../lib/index.js";

test("BackupsModule", async (t) => {
	const client = new SquareCloudAPI(process.env.SQUARE_API_KEY);
	/** @type import("../lib").Application */
	let testApp;

	t.before(async () => {
		const apps = await client.applications.get();
		testApp = apps.first();

		if (!testApp) {
			throw new Error("No test application found");
		}
	});

	await t.test("should create backup", async (t) => {
		try {
			const backup = await testApp.backups.create();
			assert.ok(backup.url);
			assert.ok(backup.key);
		} catch (err) {
			if (err.message.includes("Rate Limit Exceeded")) {
				t.skip("Rate limit exceeded");
			}
		}
	});

	await t.test("should download backup", async () => {
		const backups = await testApp.backups.list();
		const buffer = await backups[0].download();
		assert.ok(Buffer.isBuffer(buffer));
		assert.ok(buffer.length > 0);
	});

	await t.test("should list backups", async () => {
		const backups = await testApp.backups.list();

		assert.ok(Array.isArray(backups));
		if (backups.length > 0) {
			assert.ok(backups[0].url);
			assert.ok(backups[0].size);
			assert.ok(backups[0].modifiedAt);
		}
	});

	await t.test("should update cache on backups list", async () => {
		const backups = await testApp.backups.list();
		const cachedBackups = testApp.cache.get("backups");

		assert.deepStrictEqual(cachedBackups, backups);
	});

	await t.test("should emit backupsUpdate event", async () => {
		let emitted = false;
		const oldBackups = testApp.cache.get("backups");

		client.on("backupsUpdate", (app, oldBackupsEvent, newBackupsEvent) => {
			assert.strictEqual(app, testApp);
			assert.deepStrictEqual(oldBackupsEvent, oldBackups);
			assert.ok(Array.isArray(newBackupsEvent));
			emitted = true;
		});

		await testApp.backups.list();
		assert.ok(emitted, "backupsUpdate event should have been emitted");
	});
});
