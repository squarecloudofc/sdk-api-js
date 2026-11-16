import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");
const appId = process.argv[2] ?? "";

// The server closes each stream after 10 minutes, and an account can have at most
// 5 streams open at once. Stop the stream with the signal, or `break` out of the loop.
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
			// Always complete, because the SDK merges each partial update into the last state
			console.log(
				`cpu ${event.status.cpu}% ram ${event.status.ram?.join("/")}MB`,
			);
			break;
		default:
			console.log(`[${event.event}] ${event.data}`); // for example, REALTIME_CONNECTING | <id>
	}
}
