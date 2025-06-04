import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APIService } from "../lib/services/api.js";

describe("APIService", async () => {
	const service = new APIService("123-test-key");

	await it("should initialize with correct properties", () => {
		assert.strictEqual(service.baseUrl, "https://api.squarecloud.app");
		assert.strictEqual(service.version, "v2");
		assert.strictEqual(service.userId, "123");
	});

	await it("should parse request options correctly", async (t) => {
		const originalFetch = global.fetch;

		await it("should handle basic GET request", async () => {
			let requestUrl;
			let requestInit;

			global.fetch = async (url, init) => {
				requestUrl = url;
				requestInit = init;
				return new Response(JSON.stringify({ status: "success" }));
			};

			await service.request("test");

			assert.strictEqual(
				requestUrl.toString(),
				"https://api.squarecloud.app/v2/test",
			);
			assert.strictEqual(requestInit.method, "GET");
			assert.strictEqual(requestInit.headers.Authorization, "123-test-key");
			assert.strictEqual(requestInit.headers.Accept, "application/json");
		});

		await it("should handle query parameters", async () => {
			let requestUrl;

			global.fetch = async (url, init) => {
				requestUrl = url;
				return new Response(JSON.stringify({ status: "success" }));
			};

			await service.request("test", {
				query: { param1: "value1", param2: "value2" },
			});

			assert.ok(requestUrl.toString().includes("param1=value1"));
			assert.ok(requestUrl.toString().includes("param2=value2"));
		});

		await it("should handle JSON body", async () => {
			let requestInit;

			global.fetch = async (url, init) => {
				requestInit = init;
				return new Response(JSON.stringify({ status: "success" }));
			};

			const body = { test: "data" };
			await service.request("test", {
				method: "POST",
				body,
			});

			assert.strictEqual(
				requestInit.headers["Content-Type"],
				"application/json",
			);
			assert.strictEqual(requestInit.body, JSON.stringify(body));
		});

		await it("should handle FormData body", async () => {
			let requestInit;

			global.fetch = async (url, init) => {
				requestInit = init;
				return new Response(JSON.stringify({ status: "success" }));
			};

			const formData = new FormData();
			await service.request("test", {
				method: "POST",
				body: formData,
			});

			assert.strictEqual(requestInit.body, formData);
			assert.ok(!requestInit.headers["Content-Type"]);
		});

		await it("should handle error responses", async () => {
			global.fetch = async () => {
				return new Response(
					JSON.stringify({ status: "error", code: "TEST_ERROR" }),
				);
			};

			await assert.rejects(() => service.request("test"), {
				name: "SquareCloudAPIError",
				message: "Test Error",
			});
		});

		await it("should handle network errors", async () => {
			global.fetch = async () => {
				throw new Error("Network error");
			};

			await assert.rejects(() => service.request("test"), {
				name: "SquareCloudAPIError",
			});
		});

		await it("should handle specific HTTP status codes", async () => {
			const statusTests = [
				{ status: 413, code: "Payload Too Large" },
				{ status: 429, code: "Rate Limit Exceeded" },
				{ status: 502, code: "Server Unavailable" },
				{ status: 504, code: "Server Unavailable" },
			];

			for (const { status, code } of statusTests) {
				global.fetch = async () => new Response(null, { status });

				await assert.rejects(() => service.request("test"), {
					name: "SquareCloudAPIError",
					message: new RegExp(code, "ig"),
				});
			}
		});

		t.after(() => {
			global.fetch = originalFetch;
		});
	});
});
