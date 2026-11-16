import { createWriteStream } from "node:fs";
import { Writable } from "node:stream";
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");
const appId = process.argv[2] ?? "";

// ─── Create: a large snapshot is pending at first and finishes in the background ─
const snapshot = await api.apps.snapshots.create(appId);
if (snapshot.pending) {
	console.log(
		"The snapshot is still being generated. It shows up in snapshots.list() within about 2 minutes.",
	);
} else if (snapshot.url) {
	// The link is valid for 1 hour, and it is "" for a key without snapshots:read.
	// The download streams to disk and is never held in memory.
	const zip = await api.downloadSnapshot(snapshot.url);
	await zip.pipeTo(Writable.toWeb(createWriteStream("backup.zip")));
}

// ─── List and restore ─────────────────────────────────────────────────────────
const [latest] = await api.apps.snapshots.list(appId);
if (latest) {
	console.log(latest.name, latest.runtime, latest.origin, latest.version_id);

	// A listed snapshot carries everything restore() needs
	const restored = await api.apps.snapshots.restore(
		appId,
		latest.name,
		latest.version_id,
	);

	// A restore that takes longer than about 90 seconds is pending and keeps running.
	// Follow it with restoreState(), and do not call restore() again.
	let { state, code } = await api.apps.snapshots.restoreState(appId);
	while (restored.pending && (state === "queued" || state === "running")) {
		await new Promise((resolve) => setTimeout(resolve, 10_000));
		({ state, code } = await api.apps.snapshots.restoreState(appId));
	}
	console.log(state, code ?? ""); // "success", or "error" with a code such as SNAPSHOT_CORRUPT
}

// Databases work the same way. account.snapshots() lists every snapshot you own,
// on paid plans.
const all = await api.account.snapshots({ scope: "databases" });
console.log(all.length);
