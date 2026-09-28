import { createWriteStream } from "node:fs";
import { Writable } from "node:stream";
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");
const appId = process.argv[2] ?? "";

// ─── Create: large apps answer "pending" (202) and finish in the background ───
const snapshot = await api.apps.snapshots.create(appId);
if (snapshot.pending) {
	console.log(
		"Still generating: it shows up in snapshots.list() in ~2 minutes",
	);
} else {
	// Streamed to disk, never buffered in memory
	const zip = await api.downloadSnapshot(snapshot.url);
	await zip.pipeTo(Writable.toWeb(createWriteStream("backup.zip")));
}

// ─── List and restore ─────────────────────────────────────────────────────────
const [latest] = await api.apps.snapshots.list(appId);
if (latest) {
	console.log(latest.name, latest.runtime, latest.origin, latest.version_id);

	// A listed snapshot carries everything restore needs
	await api.apps.snapshots.restore(appId, latest.name, latest.version_id);
}

// Databases work the same way; account.snapshots() lists everything (paid plans)
const all = await api.account.snapshots({ scope: "databases" });
console.log(all.length);
