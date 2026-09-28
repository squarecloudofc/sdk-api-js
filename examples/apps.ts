import { SquareCloudAPI, SquareCloudAPIError } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");

// ─── Deploy: a path streams from disk; Blob/File/Uint8Array also work ─────────
const created = await api.apps.create("./my-bot.zip");
const appId = created.id;
// A workspace-shared app is addressed as `${appId}-${workspaceId}`

// ─── Lifecycle ────────────────────────────────────────────────────────────────
const app = await api.apps.get(appId);
console.log(app.name, app.language, app.domain ?? "(not a website)");

await api.apps.restart(appId);
const status = await api.apps.status(appId); // { cpu: "0.50%", ram: "120/512MB", ... }
const raw = await api.apps.status(appId, { raw: true }); // numbers instead
console.log(status.running, raw.cpu, await api.apps.logs(appId));

// ─── Environment variables ────────────────────────────────────────────────────
await api.apps.envs.set(appId, { NODE_ENV: "production" });
await api.apps.envs.delete(appId, ["DEBUG"]);

// ─── Files (text or binary, max 10 MB) ───────────────────────────────────────
await api.apps.files.write(appId, "/config.json", '{"debug":false}');
await api.apps.files.write(
	appId,
	"/logo.png",
	new Uint8Array([137, 80, 78, 71]),
);
const bytes = await api.apps.files.read(appId, "/config.json");
console.log(new TextDecoder().decode(bytes));
await api.apps.files.move(appId, "/config.json", "/config.old.json");

// ─── Commit: a zip is unpacked at `path`, others land at `path/filename` ─────
await api.apps.commit(appId, "./dist.zip", { path: "/" });
await api.apps.commit(appId, new Blob(["console.log(1)"]), {
	filename: "index.js",
});

// ─── Deploys: a webhook, or the Square Cloud GitHub App ───────────────────────
const webhook = await api.apps.deploys.setWebhook(appId, "ghp_xxx");
const linked = await api.apps.deploys.linkGithubApp(
	appId,
	"octocat/hello-world",
	"main",
);
console.log(webhook, linked.full_name, linked.branch);
for (const timeline of await api.apps.deploys.list(appId)) {
	console.log(timeline.at(-1)?.state, timeline[0]?.source);
}
const { app: repo } = await api.apps.deploys.current(appId); // {} when none
console.log(repo?.name ?? "no GitHub App link");
await api.apps.deploys.unlinkGithubApp(appId);

// ─── Network (websites) ───────────────────────────────────────────────────────
const end = new Date();
const start = new Date(end.getTime() - 24 * 3600 * 1000);
const analytics = await api.apps.network.analytics(appId, start, end, {
	country: "BR",
});
const errors = await api.apps.network.errors(appId, start, end, {
	include_4xx: true,
});
console.log(
	errors?.summary.total ?? 0,
	await api.apps.network.logs(appId, start, end),
);
console.log(analytics?.visits.length ?? "no traffic in this window");
await api.apps.network.setDomain(appId, "example.com");
await api.apps.network.purgeCache(appId);

// ─── Errors: one class, with the server's own explanation ────────────────────
try {
	await api.apps.stop(appId);
} catch (error) {
	if (!(error instanceof SquareCloudAPIError)) throw error;
	// e.g. 403 MISSING_SCOPE "This API key lacks the apps:control scope"
	console.error(
		error.status,
		error.code,
		error.message,
		error.method,
		error.path,
	);
}

await api.apps.delete(appId);
