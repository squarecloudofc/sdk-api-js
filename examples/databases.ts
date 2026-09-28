import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");

// The password is only shown here and by resetCredentials(): store it
const db = await api.databases.create({
	name: "main",
	type: "postgres",
	version: "17", // a major or major.minor prefix works
	memory: 1024,
});
console.log(db.connection_url, db.password);

await api.databases.update(db.id, { ram: 2048 });
console.log(
	await api.databases.status(db.id),
	await api.databases.metrics(db.id),
);

// TLS certificate (base64 PEM) and credential rotation
const pem = atob(await api.databases.certificate(db.id));
const password = await api.databases.resetCredentials(db.id, "password");
console.log(pem.length, password);

// Snapshots: same shape as apps
const result = await api.databases.snapshots.create(db.id);
if (!result.pending) console.log(result.url);

await api.databases.stop(db.id);
await api.databases.delete(db.id);
