import { readFile } from "node:fs/promises";
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

// ─── List your applications ────────────────────────────────────────────────
const user = await api.user.get();
console.log(`Owned applications: ${user.applications.size}`);

for (const [id, app] of user.applications) {
  console.log(`- ${app.name} (${id}) — ${app.ram}MB ${app.language}`);
}

// ─── Fetch a single application ────────────────────────────────────────────
const app = await api.applications.fetch("abc123def456abc123def456");
console.log(app.name, app.cluster, app.createdAt);

// ─── Lifecycle ─────────────────────────────────────────────────────────────
await app.start();
await app.restart();
await app.stop();

// ─── Status + logs + metrics (24h, requires ≥512MB) ────────────────────────
const status = await app.getStatus();
console.log(
  `${status.status} • CPU ${status.usage.cpu} • RAM ${status.usage.ram}`,
);

const logs = await app.getLogs();
console.log(logs);

const metrics = await app.getMetrics();
console.log(`${metrics.length} metric points (max 288 over 24h)`);

// ─── Environment variables ─────────────────────────────────────────────────
await app.envs.set({ DATABASE_URL: "postgres://...", FEATURE_FLAG: "true" });

const envs = await app.envs.list();
console.log(envs);

await app.envs.delete(["FEATURE_FLAG"]);
await app.envs.replace({ DATABASE_URL: "postgres://new-host..." }); // wipes others

// ─── File manager ──────────────────────────────────────────────────────────
const files = await app.files.list("/");
console.log(files);

const content = await app.files.read("/index.js");
console.log(content?.toString("utf8"));

await app.files.create("export default 1\n", "version.ts", "/src");
await app.files.move("/version.ts", "/src/version.ts");
await app.files.delete("/version.ts");

// ─── Commit a zip / file ───────────────────────────────────────────────────
const zip = await readFile("./dist.zip");
await app.commit(zip, "dist.zip");

// ─── Upload a new application ──────────────────────────────────────────────
const uploaded = await api.applications.create("./my-app.zip");
console.log(`Created ${uploaded.id} — ${uploaded.ram}MB`);

// ─── Delete an application ─────────────────────────────────────────────────
await app.delete();
