import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { components, paths } from "../spec/openapi.d.ts";
import type {
	Account,
	AnalyticsBucket,
	App,
	AppCreated,
	AppDomain,
	ChatCompletion,
	ChatRequest,
	Database,
	DatabaseCreate,
	DatabaseCreated,
	DatabaseUpdate,
	DeployCurrent,
	DeployEvent,
	DNSRecord,
	EnvVars,
	FileEntry,
	LinkedRepository,
	LoadBalancers,
	MetricPoint,
	NetworkAnalytics,
	NetworkErrors,
	NetworkLog,
	NetworkPerformance,
	RuntimeStats,
	ServiceStatus,
	Snapshot,
	SnapshotCreated,
	SquareCloudAPI,
	StatusListItem,
	Workspace,
	WorkspaceCreated,
	WorkspaceGroup,
} from "../src/index.ts";
import { mock } from "./helpers.ts";

// Every public operation is called against a mock transport that answers with each
// example of the pinned spec (spec/openapi.json). The request must match
// the spec; a 2xx must decode to the SDK result and a 4xx/5xx must reject with its
// (status, code).

// biome-ignore lint/suspicious/noExplicitAny: walking raw JSON
type Json = any;
const spec: Json = JSON.parse(
	readFileSync(new URL("../spec/openapi.json", import.meta.url), "utf8"),
);
const NOT_FOR_SDKS = ["GET /v2/openapi.json", "POST /v2/git/webhook/{webhook}"];

const operations = Object.entries(spec.paths).flatMap(([template, item]) =>
	Object.entries(item as Json).map(([method, op]) => ({
		key: `${method.toUpperCase()} ${template}`,
		method: method.toUpperCase(),
		regex: new RegExp(`^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`),
		op: op as Json,
	})),
);

const A = "0123456789abcdef0123456789abcdef";
const W = "fedcba9876543214a987654321fedcba";
const start = new Date("2026-09-01T00:00:00Z");
const end = "2026-09-02T00:00:00Z";
const none = () => undefined;
const orNull = (body: Json) =>
	Object.keys(body.response).length ? body.response : null;

type Case = [
	op: string,
	call: (api: SquareCloudAPI) => Promise<unknown>,
	/** Expected result for a response body (default: its `response`). */
	expected?: (body: Json, status: number) => unknown,
];

const cases: Record<string, Case> = {
	"account.me": ["GET /v2/users/me", (api) => api.account.me()],
	"account.snapshots": [
		"GET /v2/users/snapshots",
		(api) => api.account.snapshots({ scope: "databases" }),
	],
	"service.status": [
		"GET /v2/service/status",
		(api) => api.service.status(),
		(body) => body,
	],
	"ai.chat": [
		"POST /v2/ai/chat/completions",
		(api) =>
			api.ai.chat({
				model: "x",
				messages: [{ role: "user", content: "hi" }],
				max_tokens: 5,
			}),
		(body) => body,
	],
	"apps.create": [
		"POST /v2/apps",
		(api) => api.apps.create(new Uint8Array([80, 75])),
	],
	"apps.get": ["GET /v2/apps/{appId}", (api) => api.apps.get(A)],
	"apps.delete": ["DELETE /v2/apps/{appId}", (api) => api.apps.delete(A), none],
	"apps.statusAll": [
		"GET /v2/apps/status",
		(api) => api.apps.statusAll({ workspaceId: W }),
	],
	"apps.status": [
		"GET /v2/apps/{appId}/status",
		(api) => api.apps.status(`${A}-${W}`, { raw: true }),
	],
	"apps.start": [
		"POST /v2/apps/{appId}/start",
		(api) => api.apps.start(A),
		none,
	],
	"apps.stop": ["POST /v2/apps/{appId}/stop", (api) => api.apps.stop(A), none],
	"apps.restart": [
		"POST /v2/apps/{appId}/restart",
		(api) => api.apps.restart(A),
		none,
	],
	"apps.logs": [
		"GET /v2/apps/{appId}/logs",
		(api) => api.apps.logs(A),
		(body) => body.response.logs,
	],
	"apps.metrics": [
		"GET /v2/apps/{appId}/metrics",
		(api) => api.apps.metrics(A),
	],
	"apps.realtime": [
		"GET /v2/apps/{appId}/realtime",
		async (api) => {
			const events = [];
			for await (const event of api.apps.realtime(A)) events.push(event.event);
			return events;
		},
		() => ["system", "status", "status", "logs", "logs"],
	],
	"apps.domains": ["GET /v2/apps/domains", (api) => api.apps.domains()],
	"apps.loadBalancers": [
		"GET /v2/apps/load-balancers",
		(api) => api.apps.loadBalancers(),
	],
	"apps.commit": [
		"POST /v2/apps/{appId}/commit",
		(api) => api.apps.commit(A, new Uint8Array([1]), { path: "/src" }),
		none,
	],
	"apps.deploys.setWebhook": [
		"POST /v2/apps/{appId}/deploy/webhook",
		(api) => api.apps.deploys.setWebhook(A, "ghp_token"),
		(body) => body.response?.webhook ?? "",
	],
	"apps.deploys.linkGithubApp": [
		"POST /v2/apps/{appId}/deploy/github-app",
		(api) => api.apps.deploys.linkGithubApp(A, "octocat/hello-world", "main"),
		(body) => body.response.repository,
	],
	"apps.deploys.unlinkGithubApp": [
		"DELETE /v2/apps/{appId}/deploy/github-app",
		(api) => api.apps.deploys.unlinkGithubApp(A),
		none,
	],
	"apps.deploys.list": [
		"GET /v2/apps/{appId}/deployments",
		(api) => api.apps.deploys.list(A),
	],
	"apps.deploys.current": [
		"GET /v2/apps/{appId}/deployments/current",
		(api) => api.apps.deploys.current(A),
		(body) => body.response ?? {},
	],
	"apps.envs.get": ["GET /v2/apps/{appId}/envs", (api) => api.apps.envs.get(A)],
	"apps.envs.set": [
		"POST /v2/apps/{appId}/envs",
		(api) => api.apps.envs.set(A, { K: "v" }),
	],
	"apps.envs.replace": [
		"PUT /v2/apps/{appId}/envs",
		(api) => api.apps.envs.replace(A, { K: "v" }),
	],
	"apps.envs.delete": [
		"DELETE /v2/apps/{appId}/envs",
		(api) => api.apps.envs.delete(A, ["K"]),
	],
	"apps.files.list": [
		"GET /v2/apps/{appId}/files",
		(api) => api.apps.files.list(A, "/"),
	],
	"apps.files.read": [
		"GET /v2/apps/{appId}/files/content",
		(api) => api.apps.files.read(A, "/index.js"),
		(body) => new Uint8Array(Buffer.from(body.response.data, "base64")),
	],
	"apps.files.write": [
		"PUT /v2/apps/{appId}/files",
		(api) => api.apps.files.write(A, "/a.bin", new Uint8Array([0, 255])),
		none,
	],
	"apps.files.move": [
		"PATCH /v2/apps/{appId}/files",
		(api) => api.apps.files.move(A, "/a", "/b"),
		none,
	],
	"apps.files.delete": [
		"DELETE /v2/apps/{appId}/files",
		(api) => api.apps.files.delete(A, "/a"),
		none,
	],
	"apps.snapshots.list": [
		"GET /v2/apps/{appId}/snapshots",
		(api) => api.apps.snapshots.list(A),
	],
	"apps.snapshots.create": [
		"POST /v2/apps/{appId}/snapshots",
		(api) => api.apps.snapshots.create(A),
		(body, status) =>
			status === 202 ? { pending: true } : { pending: false, ...body.response },
	],
	"apps.snapshots.restore": [
		"POST /v2/apps/{appId}/snapshots/restore",
		(api) => api.apps.snapshots.restore(A, "uuid_js_manual", "v".repeat(32)),
		none,
	],
	"apps.network.analytics": [
		"GET /v2/apps/{appId}/network/analytics",
		(api) =>
			api.apps.network.analytics(A, start, end, {
				country: "BR",
				content_type: "json",
				bot: "x",
				ip: "",
			}),
		orNull,
	],
	"apps.network.errors": [
		"GET /v2/apps/{appId}/network/errors",
		(api) => api.apps.network.errors(A, start, end, { include_4xx: true }),
		orNull,
	],
	"apps.network.logs": [
		"GET /v2/apps/{appId}/network/logs",
		(api) => api.apps.network.logs(A, start, end),
	],
	"apps.network.performance": [
		"GET /v2/apps/{appId}/network/performance",
		(api) => api.apps.network.performance(A, start, end),
		orNull,
	],
	"apps.network.dns": [
		"GET /v2/apps/{appId}/network/dns",
		(api) => api.apps.network.dns(A),
	],
	"apps.network.setDomain": [
		"POST /v2/apps/{appId}/network/custom",
		(api) => api.apps.network.setDomain(A, "example.com"),
		none,
	],
	"apps.network.purgeCache": [
		"POST /v2/apps/{appId}/network/purge_cache",
		(api) => api.apps.network.purgeCache(A),
		none,
	],
	"databases.create": [
		"POST /v2/databases",
		(api) =>
			api.databases.create({
				name: "db",
				memory: 512,
				type: "postgres",
				version: "17",
			}),
	],
	"databases.get": [
		"GET /v2/databases/{databaseId}",
		(api) => api.databases.get(A),
	],
	"databases.update": [
		"PATCH /v2/databases/{databaseId}",
		(api) => api.databases.update(A, { name: "db2", ram: 1024 }),
		none,
	],
	"databases.delete": [
		"DELETE /v2/databases/{databaseId}",
		(api) => api.databases.delete(A),
		none,
	],
	"databases.start": [
		"POST /v2/databases/{databaseId}/start",
		(api) => api.databases.start(A),
		none,
	],
	"databases.stop": [
		"POST /v2/databases/{databaseId}/stop",
		(api) => api.databases.stop(A),
		none,
	],
	"databases.status": [
		"GET /v2/databases/{databaseId}/status",
		(api) => api.databases.status(A, { raw: true }),
	],
	"databases.metrics": [
		"GET /v2/databases/{databaseId}/metrics",
		(api) => api.databases.metrics(A),
	],
	"databases.statusAll": [
		"GET /v2/databases/status",
		(api) => api.databases.statusAll(),
	],
	"databases.certificate": [
		"GET /v2/databases/{databaseId}/credentials/certificate",
		(api) => api.databases.certificate(A),
		(body) => body.response.certificate,
	],
	"databases.resetCredentials": [
		"POST /v2/databases/{databaseId}/credentials/reset",
		(api) => api.databases.resetCredentials(A, "password"),
		(body) => body.response?.password ?? "",
	],
	"databases.snapshots.list": [
		"GET /v2/databases/{databaseId}/snapshots",
		(api) => api.databases.snapshots.list(A),
	],
	"databases.snapshots.create": [
		"POST /v2/databases/{databaseId}/snapshots",
		(api) => api.databases.snapshots.create(A),
		(body, status) =>
			status === 202 ? { pending: true } : { pending: false, ...body.response },
	],
	"databases.snapshots.restore": [
		"POST /v2/databases/{databaseId}/snapshots/restore",
		(api) => api.databases.snapshots.restore(A, "uuid", "v".repeat(32)),
		none,
	],
	"workspaces.create": [
		"POST /v2/workspaces",
		(api) => api.workspaces.create("team"),
	],
	"workspaces.list": ["GET /v2/workspaces", (api) => api.workspaces.list()],
	"workspaces.get": [
		"GET /v2/workspaces/{workspaceId}",
		(api) => api.workspaces.get(W),
	],
	"workspaces.delete": [
		"DELETE /v2/workspaces",
		(api) => api.workspaces.delete(W),
		none,
	],
	"workspaces.leave": [
		"DELETE /v2/workspaces/leave",
		(api) => api.workspaces.leave(W),
		none,
	],
	"workspaces.members.add": [
		"POST /v2/workspaces/members",
		(api) => api.workspaces.members.add(W, "invite", "admin"),
		none,
	],
	"workspaces.members.update": [
		"PATCH /v2/workspaces/members",
		(api) => api.workspaces.members.update(W, "user1", "view"),
		none,
	],
	"workspaces.members.remove": [
		"DELETE /v2/workspaces/members",
		(api) => api.workspaces.members.remove(W, "user1"),
		none,
	],
	"workspaces.members.inviteCode": [
		"GET /v2/workspaces/members/code",
		(api) => api.workspaces.members.inviteCode(),
		(body) => body.response.code,
	],
	"workspaces.apps.add": [
		"POST /v2/workspaces/applications",
		(api) => api.workspaces.apps.add(W, A),
		none,
	],
	"workspaces.apps.remove": [
		"DELETE /v2/workspaces/applications",
		(api) => api.workspaces.apps.remove(W, A),
		none,
	],
};

/** The exact JSON body each case must send, so arguments reach the wire. */
const bodies: Record<string, unknown> = {
	"apps.deploys.setWebhook": { access_token: "ghp_token" },
	"apps.deploys.linkGithubApp": {
		repositoryName: "octocat/hello-world",
		repositoryBranch: "main",
	},
	"apps.envs.set": { envs: { K: "v" } },
	"apps.envs.replace": { envs: { K: "v" } },
	"apps.envs.delete": { envs: ["K"] },
	"apps.files.write": { path: "/a.bin", content: "AP8=", encoding: "base64" },
	"apps.files.move": { path: "/a", to: "/b" },
	"apps.files.delete": { path: "/a" },
	"apps.snapshots.restore": {
		snapshotId: "uuid_js_manual",
		versionId: "v".repeat(32),
	},
	"apps.network.setDomain": { custom: "example.com" },
	"databases.create": {
		name: "db",
		memory: 512,
		type: "postgres",
		version: "17",
	},
	"databases.update": { name: "db2", ram: 1024 },
	"databases.resetCredentials": { reset: "password" },
	"databases.snapshots.restore": {
		snapshotId: "uuid",
		versionId: "v".repeat(32),
	},
	"workspaces.create": { name: "team" },
	"workspaces.delete": { workspaceId: W },
	"workspaces.leave": { workspaceId: W },
	"workspaces.members.add": { workspaceId: W, code: "invite", group: "admin" },
	"workspaces.members.update": {
		workspaceId: W,
		memberId: "user1",
		group: "view",
	},
	"workspaces.members.remove": { workspaceId: W, memberId: "user1" },
	"workspaces.apps.add": { workspaceId: W, appId: A },
	"workspaces.apps.remove": { workspaceId: W, appId: A },
	"ai.chat": {
		model: "x",
		messages: [{ role: "user", content: "hi" }],
		max_tokens: 5,
	},
};

/** The exact query each case must send (none when absent), so arguments reach the wire. */
const queries: Record<string, Record<string, string>> = {
	"account.snapshots": { scope: "databases" },
	"apps.statusAll": { workspaceId: W },
	"apps.status": { rawData: "true" },
	"apps.commit": { path: "/src" },
	"apps.files.list": { path: "/" },
	"apps.files.read": { path: "/index.js", encoding: "base64" },
	"apps.network.analytics": {
		start: "2026-09-01T00:00:00.000Z",
		end,
		country: "BR",
		content_type: "json",
		bot: "x",
	},
	"apps.network.errors": {
		start: "2026-09-01T00:00:00.000Z",
		end,
		include_4xx: "true",
	},
	"apps.network.logs": { start: "2026-09-01T00:00:00.000Z", end },
	"apps.network.performance": { start: "2026-09-01T00:00:00.000Z", end },
	"databases.status": { rawData: "true" },
};

/** Whether `value` fits `schema`: type, enum, bounds, items, properties, oneOf (no patterns). */
function fitsSchema(schema: Json, value: Json): boolean {
	if (schema.oneOf)
		return schema.oneOf.filter((s: Json) => fitsSchema(s, value)).length === 1;
	if (schema.enum && !schema.enum.includes(value)) return false;
	if (schema.minimum !== undefined && value < schema.minimum) return false;
	if (schema.maximum !== undefined && value > schema.maximum) return false;
	switch (schema.type) {
		case "string":
			return typeof value === "string";
		case "integer":
			return Number.isInteger(value);
		case "number":
			return typeof value === "number";
		case "boolean":
			return typeof value === "boolean";
		case "array":
			return (
				Array.isArray(value) &&
				value.every((item) => fitsSchema(schema.items ?? {}, item))
			);
		case "object":
			return (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value) &&
				Object.entries(value).every(([key, item]) =>
					fitsSchema(
						schema.properties?.[key] ??
							(typeof schema.additionalProperties === "object"
								? schema.additionalProperties
								: {}),
						item,
					),
				)
			);
	}
	return true;
}

/** Every 2xx (or 4xx/5xx) example of an operation: [status, media type, body]. */
function examples(op: Json, success = true) {
	return Object.entries(op.responses as Json)
		.filter(([status]) => status.startsWith("2") === success)
		.flatMap(([status, response]: [string, Json]) =>
			Object.entries(
				// Shared error responses are $refs into components.responses
				(response.$ref
					? spec.components.responses[response.$ref.split("/").pop()]
					: response
				).content ?? {},
			).flatMap(([type, media]: [string, Json]) =>
				(media.example !== undefined
					? [media.example]
					: Object.values(media.examples ?? {}).map((e: Json) => e.value)
				).map((body) => [Number(status), type, body] as const),
			),
		);
}

function checkRequest(name: string, expectedOp: string, request: Json) {
	const match = operations.find(
		(o) => o.method === request.method && o.regex.test(request.url.pathname),
	);
	assert.ok(
		match,
		`${name}: ${request.method} ${request.url.pathname} is not in the spec`,
	);
	assert.equal(match.key, expectedOp, `${name} hit the wrong operation`);

	const params = (match.op.parameters ?? []) as Json[];
	const declared = params.filter((p) => p.in === "query").map((p) => p.name);
	for (const key of request.url.searchParams.keys()) {
		assert.ok(
			declared.includes(key),
			`${name}: query "${key}" is not declared`,
		);
	}
	for (const p of params.filter((p) => p.in === "query" && p.required)) {
		assert.ok(
			request.url.searchParams.has(p.name),
			`${name}: missing query "${p.name}"`,
		);
	}
	for (const [key, value] of request.url.searchParams) {
		const param = params.find((p) => p.in === "query" && p.name === key);
		assert.ok(
			fitsSchema(param.schema, value),
			`${name}: query "${key}" = ${value} does not fit the spec`,
		);
	}
	assert.deepEqual(
		Object.fromEntries(request.url.searchParams),
		queries[name] ?? {},
		`${name}: wrong query`,
	);

	const content = match.op.requestBody?.content ?? {};
	const [type] = Object.keys(content);
	if (!type) {
		assert.equal(
			request.body,
			undefined,
			`${name}: sends a body the spec does not take`,
		);
		return match.key;
	}
	const schema = content[type].schema;
	const multipart = type === "multipart/form-data";
	assert.equal(
		request.body instanceof FormData,
		multipart,
		`${name}: expected a ${type} body`,
	);
	const body = multipart ? Object.fromEntries(request.body) : request.body;
	assert.equal(typeof body, "object", `${name}: expected a ${type} body`);
	for (const key of Object.keys(body)) {
		assert.ok(
			key in schema.properties,
			`${name}: body key "${key}" is not declared`,
		);
	}
	for (const key of schema.required ?? []) {
		assert.ok(key in body, `${name}: missing required body key "${key}"`);
	}
	// Multipart values are files: only JSON values are checked
	if (!multipart) {
		assert.ok(
			fitsSchema(schema, body),
			`${name}: body ${JSON.stringify(body)} does not fit the spec`,
		);
		assert.deepEqual(body, bodies[name], `${name}: wrong body`);
	}
	return match.key;
}

test("every public operation matches the pinned spec and decodes its 2xx examples", async (t) => {
	const covered = new Set<string>();
	for (const [
		name,
		[expectedOp, call, expected = (body: Json) => body.response],
	] of Object.entries(cases)) {
		const operation = operations.find((o) => o.key === expectedOp);
		assert.ok(operation, `${name}: ${expectedOp} is not in the spec`);
		const bodies = examples(operation.op);
		assert.ok(bodies.length, `${expectedOp} has no 2xx example`);

		for (const [status, type, body] of bodies) {
			await t.test(`${name} (${status})`, async () => {
				const { api, calls } = mock(() =>
					typeof body === "string"
						? new Response(body, { status, headers: { "content-type": type } })
						: new Response(JSON.stringify(body), { status }),
				);
				assert.deepEqual(await call(api), expected(body, status));
				assert.equal(calls.length, 1);
				covered.add(checkRequest(name, expectedOp, calls[0]));
			});
		}
	}

	const relevant = operations
		.map((o) => o.key)
		.filter((key) => !NOT_FOR_SDKS.includes(key));
	assert.equal(spec.info.version, "13.76.1");
	assert.equal(relevant.length, 67);
	assert.deepEqual([...covered].sort(), relevant.sort());
});

test("every documented 4xx/5xx example rejects with its (status, code)", async (t) => {
	let count = 0;
	for (const [name, [expectedOp, call]] of Object.entries(cases)) {
		const operation = operations.find((o) => o.key === expectedOp);
		for (const [status, type, body] of examples(operation?.op, false)) {
			count++;
			// Square envelope, or the AI's OpenAI dialect ({error: {code?, type}})
			const code =
				(body.error ? body.error.code || body.error.type : body.code) ||
				"UNKNOWN_ERROR";
			await t.test(`${name} (${status} ${code})`, async () => {
				const { api } = mock(
					() =>
						new Response(JSON.stringify(body), {
							status,
							headers: { "content-type": type },
						}),
					{ maxRetries: 0 },
				);
				await assert.rejects(call(api), (error: Json) => {
					assert.equal(error.name, "SquareCloudAPIError");
					assert.equal(error.status, status);
					assert.equal(error.code, code);
					return true;
				});
			});
		}
	}
	assert.equal(count, 686, "documented error examples");
});

test("ErrorCode names every code of the spec's ErrorCode enum", () => {
	// The union is type-only (no runtime value): read its source
	const source = readFileSync(
		new URL("../src/error.ts", import.meta.url),
		"utf8",
	);
	// Listed in the enum, but only an internal (non-public) route sends them
	const internal = ["SUBDOMAIN_TAKEN", "DEPLOY_FAILED"];
	const missing = (spec.components.schemas.ErrorCode.enum as string[]).filter(
		(code) => !internal.includes(code) && !source.includes(`| "${code}"`),
	);
	assert.deepEqual(missing, [], "codes missing from ErrorCode");
	for (const code of internal) assert.ok(!source.includes(`"${code}"`), code);
	assert.ok(!source.includes('"APIKEY_EXPIRED"'), "APIKEY_EXPIRED was removed");
});

test("the cases call every public operation of the client", () => {
	const { api } = mock(() => new Response());
	const leaves: string[] = [];
	const walk = (object: object, prefix: string) => {
		for (const [key, value] of Object.entries(object)) {
			if (typeof value === "function") leaves.push(`${prefix}${key}`);
			else if (value && typeof value === "object")
				walk(value, `${prefix}${key}.`);
		}
	};
	for (const group of [
		"account",
		"service",
		"ai",
		"apps",
		"databases",
		"workspaces",
	] as const) {
		walk(api[group], `${group}.`);
	}
	assert.deepEqual(leaves.sort(), Object.keys(cases).sort());
});

// Compile-time half (`pnpm typecheck`): every spec 2xx schema must fit the SDK type,
// and every SDK request type must fit the spec body.
type Body<
	P extends keyof paths,
	M extends keyof paths[P],
> = paths[P][M] extends {
	responses: { 200: { content: { "application/json": infer B } } };
}
	? B
	: never;
type Res<P extends keyof paths, M extends keyof paths[P]> =
	Body<P, M> extends {
		response?: infer R;
	}
		? R
		: never;
type Req<
	P extends keyof paths,
	M extends keyof paths[P],
> = paths[P][M] extends {
	requestBody: { content: { "application/json": infer B } };
}
	? B
	: never;
type S = components["schemas"];
/**
 * Example-derived response schemas mark only the envelope required: an example shows
 * one body, not which fields are always there. Their presence is checked by the runtime
 * half; here only the value types (nullability, enums) are compared.
 */
type Full<T> = T extends readonly (infer I)[]
	? Full<I>[]
	: T extends object
		? { [K in keyof T]-?: Full<Exclude<T[K], undefined>> }
		: T;
const fits = <T>(_value: T) => {};
const spec_ = <T>() => null as unknown as T;
/** Top-level keys, looking through arrays and null/undefined. */
type Keys<T> = T extends readonly (infer I)[]
	? Keys<I>
	: T extends object
		? keyof T & string
		: never;
/**
 * The spec response fits the SDK type AND the SDK type drops none of its keys
 * (a missing optional key would pass `fits` alone). On failure, the argument's
 * type names the missing keys.
 */
const matches = <Sdk, Spec extends Sdk>(
	_: [Exclude<Keys<Spec>, Keys<Sdk>>] extends [never]
		? true
		: Exclude<Keys<Spec>, Keys<Sdk>>,
) => {};

matches<Account, Res<"/v2/users/me", "get">>(true);
matches<Snapshot[], Res<"/v2/users/snapshots", "get">>(true);
matches<ServiceStatus, Body<"/v2/service/status", "get">>(true);
matches<ChatCompletion, Full<Body<"/v2/ai/chat/completions", "post">>>(true);
matches<AppCreated, Res<"/v2/apps", "post">>(true);
matches<App, Res<"/v2/apps/{appId}", "get">>(true);
matches<StatusListItem[], Res<"/v2/apps/status", "get">>(true);
matches<RuntimeStats<boolean>, Res<"/v2/apps/{appId}/status", "get">>(true);
matches<{ logs: string }, Full<Res<"/v2/apps/{appId}/logs", "get">>>(true);
matches<MetricPoint[], Full<Res<"/v2/apps/{appId}/metrics", "get">>>(true);
matches<MetricPoint[], Full<Res<"/v2/databases/{databaseId}/metrics", "get">>>(
	true,
);
matches<AppDomain[], Res<"/v2/apps/domains", "get">>(true);
matches<LoadBalancers, Res<"/v2/apps/load-balancers", "get">>(true);
matches<
	{ webhook: string } | undefined,
	Res<"/v2/apps/{appId}/deploy/webhook", "post">
>(true);
matches<
	{ repository: LinkedRepository },
	Full<Res<"/v2/apps/{appId}/deploy/github-app", "post">>
>(true);
matches<DeployEvent[][], Res<"/v2/apps/{appId}/deployments", "get">>(true);
matches<DeployCurrent, Res<"/v2/apps/{appId}/deployments/current", "get">>(
	true,
);
matches<EnvVars, Res<"/v2/apps/{appId}/envs", "get">>(true);
matches<FileEntry[], Res<"/v2/apps/{appId}/files", "get">>(true);
// `?encoding=base64` answers the base64 shape; its `data` is decoded to a Uint8Array
matches<
	{ encoding: "base64"; data: string },
	Extract<Res<"/v2/apps/{appId}/files/content", "get">, { encoding: "base64" }>
>(true);
matches<Snapshot[], Res<"/v2/apps/{appId}/snapshots", "get">>(true);
matches<Snapshot[], Res<"/v2/databases/{databaseId}/snapshots", "get">>(true);
matches<
	Omit<Extract<SnapshotCreated, { pending: false }>, "pending">,
	Full<Res<"/v2/apps/{appId}/snapshots", "post">>
>(true);
matches<NetworkAnalytics, S["NetworkAnalytics"]>(true);
matches<AnalyticsBucket, S["NetworkAnalyticsTotalBucket"]>(true);
matches<NetworkErrors, S["NetworkErrors"]>(true);
matches<NetworkLog[], Res<"/v2/apps/{appId}/network/logs", "get">>(true);
matches<
	NetworkPerformance,
	Full<Res<"/v2/apps/{appId}/network/performance", "get">>
>(true);
matches<DNSRecord[], Res<"/v2/apps/{appId}/network/dns", "get">>(true);
matches<DatabaseCreated, Res<"/v2/databases", "post">>(true);
matches<Database, Res<"/v2/databases/{databaseId}", "get">>(true);
matches<
	{ password?: string } | undefined,
	Res<"/v2/databases/{databaseId}/credentials/reset", "post">
>(true);
matches<
	{ certificate: string },
	Full<Res<"/v2/databases/{databaseId}/credentials/certificate", "get">>
>(true);
matches<WorkspaceCreated, Full<Res<"/v2/workspaces", "post">>>(true);
matches<Workspace[], Res<"/v2/workspaces", "get">>(true);
matches<Workspace, Res<"/v2/workspaces/{workspaceId}", "get">>(true);
matches<{ code: string }, Full<Res<"/v2/workspaces/members/code", "get">>>(
	true,
);

// The spec types tool_calls/tools items as empty objects (no properties): compare the rest
type NoTools<T> = Omit<T, "messages" | "tools">;
fits<NoTools<Req<"/v2/ai/chat/completions", "post">>>(
	spec_<NoTools<ChatRequest>>(),
);
fits<Req<"/v2/ai/chat/completions", "post">["messages"][number]["role"]>(
	spec_<ChatRequest["messages"][number]["role"]>(),
);
fits<Req<"/v2/databases", "post">>(spec_<DatabaseCreate>());
fits<Req<"/v2/apps/{appId}/deploy/github-app", "post">>({
	repositoryName: "",
	repositoryBranch: "",
});
fits<Req<"/v2/databases/{databaseId}", "patch">>(spec_<DatabaseUpdate>());
fits<Req<"/v2/workspaces/members", "post">["group"]>(spec_<WorkspaceGroup>());
