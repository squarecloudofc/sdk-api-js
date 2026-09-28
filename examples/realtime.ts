import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");
const appId = process.argv[2] ?? "";

// Each stream lives up to 10 minutes; max 5 concurrent streams per account.
// Stop it with the signal (or just `break` out of the loop).
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());

for await (const event of api.apps.realtime(appId, {
	signal: controller.signal,
})) {
	switch (event.event) {
		case "logs":
			(event.stream === "stderr" ? process.stderr : process.stdout).write(
				`${event.line}\n`,
			);
			break;
		case "status":
			// Always complete: lean frames are merged onto the last full frame
			console.log(
				`cpu ${event.status.cpu}% ram ${event.status.ram?.join("/")}MB`,
			);
			break;
		default:
			console.log(`[${event.event}] ${event.data}`); // e.g. REALTIME_CONNECTING | <id>
	}
}
