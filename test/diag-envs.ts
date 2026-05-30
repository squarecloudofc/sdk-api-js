/**
 * Diagnostic script — captures raw HTTP responses from the 4 envs routes
 * (GET, POST, PUT, DELETE) on a freshly created application. Bypasses the
 * SDK so the responses can be compared against the OpenAPI contract when
 * debugging unexpected error codes or shape regressions.
 *
 * Usage:
 *   node --env-file-if-exists=.env test/diag-envs.ts
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = "https://api.squarecloud.app/v2";
const apiKey = process.env.SQUARE_API_KEY;

if (!apiKey) {
  console.error("SQUARE_API_KEY not set");
  process.exit(1);
}

const headers = { Authorization: apiKey };

async function probe(
  label: string,
  method: string,
  url: string,
  body?: unknown,
) {
  const init: RequestInit = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["Content-Type"] =
      "application/json";
  }

  const res = await fetch(url, init);
  const text = await res.text();
  console.log(`\n--- ${label} ${method} ${url} ---`);
  console.log(`HTTP ${res.status} ${res.statusText}`);
  console.log(`body: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// 1. Upload fresh app
console.log("[1] uploading test app...");
const zip = await readFile(path.join(__dirname, "fixtures/test-app.zip"));
const fd = new FormData();
fd.append("file", new Blob([new Uint8Array(zip)]), "app.zip");

const uploadRes = await fetch(`${API}/apps`, {
  method: "POST",
  headers,
  body: fd,
});
const upload = await uploadRes.json();
const appId = upload.response?.id;
if (!appId) {
  console.error("upload failed:", upload);
  process.exit(1);
}
console.log(`created app ${appId}`);

// 2. Wait until running
console.log("[2] polling status until running...");
for (let i = 0; i < 30; i++) {
  await setTimeout(2000);
  const sres = await fetch(`${API}/apps/${appId}/status`, { headers });
  const sjson = await sres.json();
  if (sjson.response?.running) {
    console.log(`running after ${i * 2}s — sleeping 5s for storage settle`);
    await setTimeout(5000);
    break;
  }
}

// 3. Probe each envs verb on the fresh app
await probe("GET (list)", "GET", `${API}/apps/${appId}/envs`);
await probe("POST (set/merge)", "POST", `${API}/apps/${appId}/envs`, {
  envs: { __SDK_DIAG__: "hello" },
});
await probe("GET (list, after POST)", "GET", `${API}/apps/${appId}/envs`);
await probe("PUT (replace)", "PUT", `${API}/apps/${appId}/envs`, {
  envs: { __SDK_DIAG_PUT__: "world" },
});
await probe("DELETE (remove)", "DELETE", `${API}/apps/${appId}/envs`, {
  envs: ["__SDK_DIAG_PUT__"],
});

// 4. Cleanup
console.log("\n[4] cleaning up...");
await fetch(`${API}/apps/${appId}`, { method: "DELETE", headers });
console.log("done");
