<div align="center">
  <img alt="Square Cloud Banner" src="https://cdn.squarecloud.app/png/github-readme.png">
</div>

<h1 align="center">@squarecloud/api</h1>

<p align="center">The official JavaScript SDK for the <a href="https://squarecloud.app" target="_blank">Square Cloud</a> API.</p>

<div align="center">
  <a href="https://www.npmjs.com/package/@squarecloud/api"><img alt="npm Version" src="https://img.shields.io/npm/v/@squarecloud/api"></a>
  <img alt="License" src="https://img.shields.io/npm/l/@squarecloud/api">
  <img alt="Downloads" src="https://img.shields.io/npm/dw/@squarecloud/api">
</div>

- **Zero runtime dependencies**, ~23 KB (8 KB gzipped), ESM + CommonJS.
- Runs on **Node.js 22+, Deno, Bun and edge runtimes**: only `fetch`, `FormData`, `Blob` and web streams. A browser works too, but would expose your API key.
- Covers all **67 operations** of the Square Cloud API, checked against the [pinned spec](spec/openapi.json) on every CI run.
- Uploads and snapshot downloads **stream**; realtime logs and status come as an **async iterator**.
- **One error type**, `SquareCloudAPIError`, for every API, network and local failure.

[Documentation](https://docs.squarecloud.app/en/sdks/js/client) · [Releases](https://github.com/squarecloudofc/sdk-api-js/releases) · [Migration guide](MIGRATION.md)

## Installation

```bash
npm install @squarecloud/api
pnpm add @squarecloud/api
yarn add @squarecloud/api
bun add @squarecloud/api
deno add npm:@squarecloud/api
```

Requires Node.js 22 or newer.

## API key

Create one at [squarecloud.app/account/security](https://squarecloud.app/account/security). A key can be limited to scopes (`apps:read`, `apps:deploy`, ...) and to specific apps or databases. A call outside those limits throws a `SquareCloudAPIError` with 403 `MISSING_SCOPE` or `RESOURCE_NOT_ALLOWED`, and list endpoints return only the resources the key can see.

## Quick start

```ts
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY!);

const { user, applications } = await api.account.me();
console.log(`Hi ${user.name}, you have ${applications.length} apps`);

const appId = applications[0].id;
await api.apps.restart(appId);
console.log(await api.apps.logs(appId));
```

Every method takes ids first and returns plain data (no classes). Mutations resolve to `undefined` unless the API returns data (`envs.*`, `deploys.setWebhook`, `deploys.linkGithubApp`, `databases.resetCredentials`, the `create` methods). A string result is never `undefined`: it is `""` when the API sends none. More in [`examples/`](examples): [apps](examples/apps.ts), [realtime](examples/realtime.ts), [snapshots](examples/snapshots.ts), [databases](examples/databases.ts), [workspaces](examples/workspaces.ts).

## Configuration

```ts
import { BASE_URL, SquareCloudAPI } from "@squarecloud/api";

new SquareCloudAPI(apiKey, {
  baseUrl: BASE_URL, // "https://api.squarecloud.app/v2" (default)
  timeoutMs: 30_000,
  maxRetries: 2,
  userAgent: "my-bot/1.0",
  fetch, // custom fetch (proxy, tracing, tests)
});
```

| Option | Default | Notes |
|---|---|---|
| `apiKey` (1st argument) | required | Sent raw in `Authorization`. An empty or whitespace-only key throws a `TypeError`. |
| `baseUrl` | `BASE_URL` = `https://api.squarecloud.app/v2` | A trailing `/` is stripped. |
| `timeoutMs` | `30000` | Per attempt. `<= 0`, `Infinity` or `>= 2^31` disables every timeout, floors included. See [Retries, timeouts and rate limits](#retries-timeouts-and-rate-limits). |
| `maxRetries` | `2` | Negative counts as 0. |
| `userAgent` | `squarecloud-sdk-js/<version>` | Replaces the whole `User-Agent` header. |
| `fetch` | the global `fetch` | Any `fetch`-compatible function. |

## API

Every app id may also be the composite `<appId>-<workspaceId>` to act on an app shared with you through a workspace.

| Group | Methods |
|---|---|
| `api.account` | `me()`, `snapshots({ scope })` |
| `api.service` | `status()` (public, no key needed) |
| `api.ai` | `chat(request)` (OpenAI-compatible, non-streaming) |
| `api.apps` | `create(file, { signal })`, `get(id)`, `delete(id)`, `statusAll({ workspaceId })`, `status(id, { raw })`, `start(id)`, `stop(id)`, `restart(id)`, `logs(id)`, `metrics(id)`, `realtime(id, { signal })`, `domains()`, `loadBalancers()`, `commit(id, file, { path, filename, signal })` |
| `api.apps.deploys` | `setWebhook(id, accessToken)`, `linkGithubApp(id, repository, branch)`, `unlinkGithubApp(id)`, `list(id)`, `current(id)` |
| `api.apps.envs` | `get(id)`, `set(id, envs)`, `replace(id, envs)`, `delete(id, keys)` |
| `api.apps.files` | `list(id, path?)`, `read(id, path)` → `Uint8Array`, `write(id, path, content, { signal })`, `move(id, path, to)`, `delete(id, path)` |
| `api.apps.snapshots` | `list(id)`, `create(id)`, `restore(id, name, versionId)` |
| `api.apps.network` | `analytics(id, start, end, filters?)`, `errors(id, start, end, { include_4xx })`, `logs(id, start, end)`, `performance(id, start, end)`, `dns(id)`, `setDomain(id, domain)`, `purgeCache(id)` |
| `api.databases` | `create(db)`, `get(id)`, `update(id, { name, ram })`, `delete(id)`, `start(id)`, `stop(id)`, `status(id, { raw })`, `metrics(id)`, `statusAll()`, `certificate(id)`, `resetCredentials(id, "password" \| "certificate")` → the new password, or `""` |
| `api.databases.snapshots` | `list(id)`, `create(id)`, `restore(id, name, versionId)` |
| `api.workspaces` | `create(name)`, `list()`, `get(id)`, `delete(id)`, `leave(id)` |
| `api.workspaces.members` | `add(workspaceId, code, group)`, `update(workspaceId, memberId, group)`, `remove(workspaceId, memberId)`, `inviteCode()` |
| `api.workspaces.apps` | `add(workspaceId, appId)`, `remove(workspaceId, appId)` |
| `api` | `downloadSnapshot(url, { signal })` → `ReadableStream` |

Field names are the API's own (`created_at`, `content_type`, `include_4xx`...), so the [API reference](https://docs.squarecloud.app/api-reference) applies as-is. `start`/`end` take an ISO string or a `Date`. Empty, `.` and `..` ids are rejected with `INVALID_ID` before sending, because they would reach another route. `network.analytics`, `errors` and `performance` return `null` for a window with no traffic. Each analytics filter takes the exact `type` value of its breakdown (a provider is `"NAME (ASN)"`, e.g. `GOOGLE (15169)`); an invalid one is 400 `INVALID_FILTER`. `metrics()` points come newest first.

## Usage

### Uploads

`apps.create()` and `apps.commit()` take a file path (Node.js, Deno, Bun), a `Blob`/`File` or a `Uint8Array`. A path is opened with `fs.openAsBlob` and streamed from disk, never read into memory. A commit unpacks a `.zip` at `path` (the app root by default); any other file lands at `path/<filename>`. The filename is `filename`, else the file's own name, else `app.zip` on create and `commit.zip` on commit. A zip over 100 MB fails locally with `FILE_TOO_LARGE` before anything is sent. Uploads have no timeout: pass a `signal` to cancel one.

```ts
const { id } = await api.apps.create("./bot.zip");
await api.apps.commit(id, "./patch.zip", { path: "/src" });
await api.apps.commit(id, new Blob([code]), { path: "/src", filename: "index.js" });
```

### Files

```ts
await api.apps.files.write(appId, "/config.json", '{"debug": false}'); // string or bytes
const bytes: Uint8Array = await api.apps.files.read(appId, "/config.json");
await api.apps.files.move(appId, "/config.json", "/config.old.json");
```

A string is sent as plain text and bytes as base64, so any binary content round-trips; empty content (`""` or empty bytes) creates an empty file. `read()` asks for base64 and returns the decoded bytes. Content over 10 MB fails locally with `FILE_TOO_LARGE` (the API answers 413 `FILE_TOO_LARGE` for a larger file on `read()`), and content over 1 MiB is sent without a timeout, like an upload (pass `{ signal }` to cancel it). `list()` of a missing directory is 404 `FILE_NOT_FOUND`, a path the file manager does not expose is 403 `BLOCKED_PATH`, and paths are at most 256 characters.

### Snapshots

`create()` returns `{ pending: true }` while the API is still generating the snapshot (HTTP 202 `SNAPSHOT_PROCESSING`). It then appears in `list()` on its own, usually within 2 minutes: poll `list()`, and never call `create()` again, which is limited to one per 180 seconds and counts against the plan's daily snapshot quota.

```ts
const result = await api.apps.snapshots.create(appId);
if (!result.pending) {
  const zip = await api.downloadSnapshot(result.url); // ReadableStream, nothing buffered
  await zip.pipeTo(Writable.toWeb(fs.createWriteStream("backup.zip")));
}

const [latest] = await api.apps.snapshots.list(appId);
await api.apps.snapshots.restore(appId, latest.name, latest.version_id);
```

Every listed snapshot carries the `version_id` that `restore()` takes and a signed download `url` (valid 30 days), under the API's own names. A failed restore is 404 `SNAPSHOT_RESTORE_FAILED`. `downloadSnapshot()` never sends the API key to the snapshot host and has no timeout (pass a `signal`).

### Realtime

```ts
const controller = new AbortController();
for await (const event of api.apps.realtime(appId, { signal: controller.signal })) {
  if (event.event === "logs") console.log(event.stream, event.line); // stdout | stderr
  else if (event.event === "status") console.log(event.status.cpu); // always the full, merged state
  else console.log(event.data); // "system" or "error": a code such as REALTIME_DISCONNECTED
}
```

Every event has `event`, `data` (the raw frame text) and `id`. The HTTP status is checked before streaming, so 429 `REALTIME_MAX_CONNECTIONS` throws. A dropped connection, or the API's `REALTIME_RECONNECT` hand-off, reopens up to 3 times in a row (a `logs` or `status` event resets the count), at most one open per 5.5 s to stay under the API's pace of one per 5 s; past that it throws `NETWORK_ERROR`. The open is timed until the response headers arrive; the stream itself is not. The loop ends on a clean close (10-minute server limit), on `REALTIME_DISCONNECTED`, on `break` or on `abort()`. Max 5 concurrent streams per account and 30 per app.

### GitHub deploys

```ts
// A GitHub webhook: returns its URL ("" when removed with "@")
const url = await api.apps.deploys.setWebhook(appId, "ghp_xxx");

// Or the Square Cloud GitHub App
const repo = await api.apps.deploys.linkGithubApp(appId, "octocat/hello-world", "main");
console.log(repo.id, repo.full_name, repo.branch);

const { app, webhook } = await api.apps.deploys.current(appId); // {} when nothing is set
await api.apps.deploys.unlinkGithubApp(appId);
```

Linking needs scope `apps:deploy` and a GitHub App installation on the account (403 `GITHUB_NOT_CONNECTED` otherwise), and the repository must belong to a GitHub App installation your connected GitHub account holds (403 `REPOSITORY_NOT_AVAILABLE` otherwise), with write access to it (403 `REPOSITORY_PERMISSION_REQUIRED`). A 502 `FAILED_TO_FETCH` means GitHub did not confirm the branch: retry. A repository and branch already linked to another app, of any account, is 409 `REPOSITORY_BRANCH_ALREADY_CONFIGURED` (the other app's id is in `message` only when that app is yours). Re-linking needs an unlink first (400 `GIT_ALREADY_CONFIGURED`), and unlinking without a link is 400 `GIT_NOT_CONFIGURED`. Link and unlink share a limit of 3 calls per 60 s.

## Errors

Every API and network failure throws a `SquareCloudAPIError` with `status`, `code`, `message`, `method`, `path` (`/v2/apps/...`, never the query string) and `cause`. Two failures are not wrapped: an `abort()` rejects with the signal's reason, and an upload path that cannot be opened throws the file-system error.

```ts
import { SquareCloudAPIError } from "@squarecloud/api";

try {
  await api.apps.start(appId);
} catch (error) {
  if (error instanceof SquareCloudAPIError && error.code === "MISSING_SCOPE") {
    console.error(error.message); // which scope the key lacks
  }
}
```

- No response: `status` `0` with `code` `NETWORK_ERROR` (original error in `cause`) or `TIMEOUT`.
- Local checks, nothing sent: `status` `0` with `FILE_TOO_LARGE`, or `INVALID_ID` for an id that is empty, `.` or `..`.
- `message` is the server's explanation, or the code when it sent only a code. A body without a code (a proxy page, a failed snapshot download) is `UNKNOWN_ERROR` with the message `HTTP <status>`; a 2xx body that is not JSON is `UNKNOWN_ERROR` with `Invalid JSON in HTTP <status> response`.
- A refused `start`/`stop`/`restart` is 409 with a code only (`CONTAINER_ALREADY_STARTED`, `CONTAINER_ALREADY_STOPPED`, `CONTAINER_TEMPORARILY_SUSPENDED`, `CONTAINER_NOT_FOUND`, `CONTAINER_INSUFFICIENT_DISK_SPACE`, `CONTAINER_NETWORK_CONFLICT`, `ACTION_FAILED`), so read `code`, not `message`. Starting a running app or database is `CONTAINER_ALREADY_STARTED`, stopping a stopped one `CONTAINER_ALREADY_STOPPED`. A 2xx reply whose body is `{"status": "error"}` also throws; a 202 `SNAPSHOT_PROCESSING` stays `{ pending: true }`.
- A missing, unknown or expired key is 401 `ACCESS_DENIED`.
- Every `ai.chat()` error, auth, rate limits and 5xx included, is OpenAI-shaped: `code` is its lowercase OpenAI code (`access_denied`, `upgrade_required`, `rate_limit_exceeded`, `database_unavailable`, ...), or its `type` when there is no code.
- The `ErrorCode` type lists every code of the API's contract for autocompletion.

## Retries, timeouts and rate limits

- **Timeouts:** `timeoutMs` (30 s) applies per attempt. Calls the server holds open wait at least 120 s (`start`/`stop`/`restart` of apps and databases, `databases.create`, snapshot `create`/`restore`) and `ai.chat()`; a larger `timeoutMs` wins. `timeoutMs <= 0`, `Infinity` or `>= 2^31` disables every timeout, floors included. Uploads, `files.write` above 1 MiB and `downloadSnapshot()` have no timeout (pass a `signal`); `realtime()` is timed only until it opens. The AI gateway gives `ai.chat()` 90 s for the whole request, then answers 503 `server_overloaded`, which is safe to retry yourself.
- **Retries:** the SDK retries only what is safe: network errors on `GET` (including a body cut off mid-read, realtime opens and `downloadSnapshot()` before the response), and 503 `UPLOAD_BUSY`/`ANALYTICS_BUSY` (plus `DATABASE_UNAVAILABLE` on `GET`), up to `maxRetries` (2) times with exponential backoff (500 ms·2ⁿ, jitter, max 8 s). Timeouts, 429 and the AI's 503 `server_overloaded` (a non-idempotent `POST`) are never retried. 503 `DATABASE_UNAVAILABLE` can come after a mutation was already applied, so the SDK does not retry it on other methods: retry your idempotent mutations yourself.
- **Rate limits:** every account has a global limit of requests per 60 s, set by its plan ([values](https://docs.squarecloud.app/en/api-reference/limitations-and-restrictions)). Going over it, or over a route's own limit, returns 429 `RATE_LIMITED` or `KEEP_CALM`. `RATE_LIMITED` can block the account, API key or IP for about 30 minutes (the API renamed `RATE_LIMIT` and `RATE_LIMIT_EXCEEDED` to `RATE_LIMITED`). The API sends no `Retry-After`, which is why the SDK never retries a 429.

## Development

```bash
pnpm install
pnpm biome ci . && pnpm typecheck && pnpm test   # offline: the transport is mocked
pnpm build                                        # lib/ (ESM + CJS + d.ts)
pnpm gen:spec                                     # regenerate spec/openapi.d.ts after updating spec/openapi.json
```

The offline suites (`test/transport.test.ts`, `test/streams.test.ts`, `test/conformance.test.ts`) never reach the API. The live suite runs all 67 operations against the real API:

```bash
SQUARECLOUD_API_KEY=... pnpm test:live
```

> **Warning:** the live suite creates and deletes real resources (an app, a database and a workspace named `sdk-live-js-<timestamp>`) on the key's account. It is skipped without `SQUARECLOUD_API_KEY`, never runs in CI, and needs Node.js 22.2 or newer. Requests are spaced 2.1 s apart; run the JS, Python and Go live suites one after another, never at the same time.

## Contributing

Issues and pull requests are welcome at [squarecloudofc/sdk-api-js](https://github.com/squarecloudofc/sdk-api-js).

## License

MIT, see [LICENSE](LICENSE).

## Authors

Maintained by [Square Cloud](https://squarecloud.app).

Contributors:

- João Otávio Stivi ([@JoaoOtavioS](https://github.com/JoaoOtavioS))
- João Gabriel Tonaco ([@joaotonaco](https://github.com/joaotonaco))
