import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);
const app = await api.applications.fetch("abc123def456abc123def456");

// ─── Open a Server-Sent Events stream ──────────────────────────────────────
// Each connection lasts up to 10 minutes. Max 10 concurrent per account.
// The stream emits `event: system` (REALTIME_CONNECTING/TIMEOUT/...) and
// `event: message` (application payload) frames.
const response = await app.realtime();

if (!response.body) {
  throw new Error("No stream body");
}

const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

let buffer = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  buffer += value;

  // SSE frames are separated by `\n\n`
  let separator = buffer.indexOf("\n\n");
  while (separator !== -1) {
    const rawFrame = buffer.slice(0, separator);
    buffer = buffer.slice(separator + 2);
    separator = buffer.indexOf("\n\n");

    const event = parseSSE(rawFrame);
    if (!event) continue;

    if (event.name === "system") {
      console.log(`[system] ${event.data}`);
      continue;
    }

    try {
      const payload = JSON.parse(event.data);
      console.log("[message]", payload);
    } catch {
      console.log("[message]", event.data);
    }
  }
}

function parseSSE(frame: string): { name: string; data: string } | null {
  let name = "message";
  let data = "";

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }

  return data ? { name, data } : null;
}
