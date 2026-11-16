import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");

// Store the password now, because only create() and resetCredentials() return it
const db = await api.databases.create({
	name: "main",
	type: "postgres",
	version: "17", // a major or major.minor version prefix also works
	memory: 1024,
});
console.log(db.connection_url, db.password);

await api.databases.update(db.id, { ram: 2048 });
console.log(
	await api.databases.status(db.id),
	await api.databases.metrics(db.id),
);

// The TLS certificate, as a base64-encoded PEM, and a new password
const pem = atob(await api.databases.certificate(db.id));
const password = await api.databases.resetCredentials(db.id, "password");
console.log(pem.length, password);

// Snapshots work the same way as for applications
const result = await api.databases.snapshots.create(db.id);
if (!result.pending) console.log(result.url);

await api.databases.stop(db.id);
await api.databases.delete(db.id);
