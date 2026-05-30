import { writeFile } from "node:fs/promises";
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

// ─── Create a database ─────────────────────────────────────────────────────
// Available on Standard, Pro, and Enterprise plans.
// `password` and `certificate` are shown only here — store them now.
const created = await api.databases.create({
  name: "my-mongo",
  memory: 512,
  type: "mongo",
  version: "7.0",
});

console.log(`ID: ${created.id}`);
console.log(`Connection URL: ${created.connection_url}`);
console.log(`Password (save this!): ${created.password}`);

// ─── List + fetch ──────────────────────────────────────────────────────────
const { databases } = await api.user.get();
console.log(`Owned databases: ${databases.size}`);

const db = await api.databases.fetch(created.id);
console.log(`${db.name} • ${db.type} • ${db.ram}MB • port ${db.port}`);

// ─── Lifecycle + monitoring ────────────────────────────────────────────────
const status = await db.getStatus();
console.log(
  `${status.status} • CPU ${status.usage.cpu} • RAM ${status.usage.ram}`,
);

const metrics = await db.getMetrics();
console.log(`${metrics.length} metric points`);

await db.stop();
await db.start();

// Compact status for all databases at once
const all = await api.databases.statusAll();
for (const s of all) {
  console.log(`${s.databaseId} → ${s.running ? "running" : "stopped"}`);
}

// ─── Update name/memory ────────────────────────────────────────────────────
await db.update({ name: "primary-db", ram: 1024 });

// ─── Credentials ───────────────────────────────────────────────────────────
// The database must be running for these endpoints to succeed.
const cert = await db.credentials.certificate(); // base64-encoded PEM
console.log(`Certificate (${cert.length} chars)`);

// Rotate password — the new value is shown once
const { password } = await db.credentials.reset("password");
console.log(`New password: ${password}`);

// Rotate certificate — fetch the new one via .certificate()
await db.credentials.reset("certificate");

// ─── Snapshots ─────────────────────────────────────────────────────────────
const snapshots = await db.snapshots.list();
console.log(`${snapshots.length} snapshots stored`);

const fresh = await db.snapshots.create();
console.log(`Snapshot URL: ${fresh.url}`);

const buffer = await db.snapshots.download();
await writeFile("./db-backup.tar.gz", buffer);

await db.snapshots.restore("00000000-0000-4000-8000-000000000000_mongo", "v1");

// ─── Delete ────────────────────────────────────────────────────────────────
await db.delete();
