import { writeFile } from "node:fs/promises";
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);
const app = await api.applications.fetch("abc123def456abc123def456");

// ─── List existing snapshots ───────────────────────────────────────────────
const snapshots = await app.snapshots.list();

for (const snap of snapshots) {
  console.log(snap.url);
  console.log(
    `size=${snap.size} bytes • modified=${snap.modifiedAt.toISOString()}`,
  );
}

// ─── Create + download a new snapshot ──────────────────────────────────────
// `.create()` returns `{ url, key }` (signed, valid for 30 days)
const fresh = await app.snapshots.create();
console.log(`Download URL: ${fresh.url}`);

// `.download()` does create+fetch+buffer in one step
const buffer = await app.snapshots.download();
await writeFile("./backup.zip", buffer);

// ─── Restore from a snapshot ───────────────────────────────────────────────
// Pass the snapshot id (UUID v4) + version id from the listing
await app.snapshots.restore({
  snapshotId: "00000000-0000-4000-8000-000000000000",
  versionId: "abc123def4567890",
});

// ─── List all your snapshots (across apps or databases) ────────────────────
const userSnapshots = await api.user.snapshots("applications"); // or "databases"
console.log(`${userSnapshots.length} snapshots`);
