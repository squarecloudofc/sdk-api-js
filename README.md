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

- **Zero runtime dependencies**, about 17 KB (5.5 KB gzipped), as ESM and CommonJS.
- Runs on **Node.js 22+, Deno, Bun and edge runtimes**. It also runs in a browser, but that would expose your API key.
- Covers all **69 operations** of the Square Cloud API, checked against the pinned OpenAPI spec on every CI run.
- Uploads and snapshot downloads **stream**, and realtime logs and status arrive as an **async iterator**.
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

Create one at [squarecloud.app/account/security](https://squarecloud.app/account/security). You can limit a key to scopes, such as `apps:read` or `apps:deploy`, and to specific applications or databases. A call outside those limits throws a `SquareCloudAPIError` with 403 `MISSING_SCOPE` or `RESOURCE_NOT_ALLOWED`, and list methods return only the resources the key can see.

## Quick start

```ts
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY!);

const { user, applications } = await api.account.me();
console.log(`Hi ${user.name}, you have ${applications.length} applications`);

const appId = applications[0].id;
await api.apps.restart(appId);
console.log(await api.apps.logs(appId));
```

Every method takes ids first and returns plain objects. A method that changes something resolves to `undefined`, unless the API returns data or the SDK reports progress. The `create` methods, `envs.*`, `deploys.setWebhook()`, `deploys.linkGithubApp()` and `databases.resetCredentials()` return data, and `snapshots.restore()` reports progress with `{ pending }`. A string result is never `undefined`, because the SDK returns `""` when the API sends none. More examples are in [`examples/`](examples): [apps](examples/apps.ts), [realtime](examples/realtime.ts), [snapshots](examples/snapshots.ts), [databases](examples/databases.ts) and [workspaces](examples/workspaces.ts).

## Configuration

```ts
import { BASE_URL, SquareCloudAPI } from "@squarecloud/api";

new SquareCloudAPI(apiKey, {
  baseUrl: BASE_URL, // "https://api.squarecloud.app/v2", the default
  timeoutMs: 30_000,
  maxRetries: 2,
  userAgent: "my-bot/1.0",
  fetch, // for example, a fetch that adds a proxy or tracing
});
```

| Option | Default | Notes |
|---|---|---|
| `apiKey` (1st argument) | required | An empty or whitespace-only key throws a `TypeError`. |
| `baseUrl` | `BASE_URL` = `https://api.squarecloud.app/v2` | A trailing `/` is removed. |
| `timeoutMs` | `30000` | The timeout of each attempt. A value of `0` or less, `Infinity`, or `2^31` or more disables every timeout, including the 120-second minimum. See [Retries, timeouts and rate limits](#retries-timeouts-and-rate-limits). |
| `maxRetries` | `2` | A negative value means no retries. |
| `userAgent` | `squarecloud-sdk-js/<version>` | Replaces the whole `User-Agent` header. |
| `fetch` | the global `fetch` | Any `fetch`-compatible function. |

## API

Every application id can also be a composite id, `<appId>-<workspaceId>`, which acts on an application that someone shared with you through a workspace.

| Group | Methods |
|---|---|
| `api.account` | `me()`, `snapshots({ scope })` |
| `api.service` | `status()`, which works without a valid API key |
| `api.ai` | `chat(request)`, in the OpenAI chat completions format, without streaming |
| `api.apps` | `create(file, { signal })`, `get(id)`, `delete(id)`, `statusAll({ workspaceId })`, `status(id, { raw })`, `start(id)`, `stop(id)`, `restart(id)`, `logs(id)`, `metrics(id, { range })`, `realtime(id, { signal })`, `domains()`, `loadBalancers()`, `commit(id, file, { path, filename, signal })` |
| `api.apps.deploys` | `setWebhook(id, accessToken)`, `linkGithubApp(id, repository, branch)`, `unlinkGithubApp(id)`, `list(id)`, `current(id)` |
| `api.apps.envs` | `get(id)`, `set(id, envs)`, `replace(id, envs)`, `delete(id, keys)` |
| `api.apps.files` | `list(id, path?)`, `read(id, path)` → `Uint8Array`, `write(id, path, content, { signal })`, `move(id, path, to)`, `delete(id, path)` |
| `api.apps.snapshots` | `list(id)`, `create(id)`, `restore(id, name, versionId)` → `{ pending }`, `restoreState(id)` |
| `api.apps.network` | `analytics(id, start, end, filters?)`, `errors(id, start, end, { include_4xx })`, `logs(id, start, end)`, `performance(id, start, end)`, `dns(id)`, `setDomain(id, domain)`, `purgeCache(id)` |
| `api.databases` | `create(db)`, `get(id)`, `update(id, { name, ram })`, `delete(id)`, `start(id)`, `stop(id)`, `status(id, { raw })`, `metrics(id, { range })`, `statusAll()`, `certificate(id)`, `resetCredentials(id, "password" \| "certificate")` → the new password, or `""` |
| `api.databases.snapshots` | `list(id)`, `create(id)`, `restore(id, name, versionId)` → `{ pending }`, `restoreState(id)` |
| `api.workspaces` | `create(name)`, `list()`, `get(id)`, `delete(id)`, `leave(id)` |
| `api.workspaces.members` | `add(workspaceId, code, group)`, `update(workspaceId, memberId, group)`, `remove(workspaceId, memberId)`, `inviteCode()` |
| `api.workspaces.apps` | `add(workspaceId, appId)`, `remove(workspaceId, appId)` |
| `api` | `downloadSnapshot(url, { signal })` → `ReadableStream` |

Field names are the API's own, such as `created_at`, `content_type` and `include_4xx`, so the [API reference](https://docs.squarecloud.app/api-reference) applies as is.

- `start` and `end` take an ISO 8601 string or a `Date`.
- An id that is empty, `.` or `..` throws `INVALID_ID` before anything is sent.
- `network.analytics()`, `errors()` and `performance()` return `null` for a window with no traffic.
- Each analytics filter takes the exact `type` value of an item in its breakdown. A provider looks like `GOOGLE (15169)`. A malformed filter throws 400 `INVALID_FILTER`.
- `metrics()` returns points newest first. By default it covers the last 24 hours, with a point every 5 minutes, or every 10 minutes for applications under 512 MB. With `{ range: "7d" }` it returns hourly points for the last 7 days, with the hour's `cpu_max` and `ram_max` peaks, on Pro and Enterprise plans for 512 MB or more. Other plans and smaller applications get the 24-hour answer without an error, so check the points you got rather than the range you asked for. An unknown range throws 400 `INVALID_PARAMETERS`.

## Usage

### Uploads

`apps.create()` and `apps.commit()` take a file path (Node.js, Deno and Bun), a `Blob` or `File`, or a `Uint8Array`. A path is streamed from disk and never read into memory. A commit unpacks a `.zip` at `path`, which is the application root by default, and writes any other file to `path/<filename>`. The file name is `filename` when you pass one, then the file's own name, then `app.zip` for `create()` and `commit.zip` for `commit()`. A zip over 100 MB throws `FILE_TOO_LARGE` before anything is sent. Uploads have no timeout, so pass a `signal` to cancel one.

```ts
const { id } = await api.apps.create("./bot.zip");
await api.apps.commit(id, "./patch.zip", { path: "/src" });
await api.apps.commit(id, new Blob([code]), { path: "/src", filename: "index.js" });
```

### Files

```ts
await api.apps.files.write(appId, "/config.json", '{"debug": false}'); // a string or bytes
const bytes: Uint8Array = await api.apps.files.read(appId, "/config.json");
await api.apps.files.move(appId, "/config.json", "/config.old.json");
```

A string is written as text and bytes are written as they are, so binary files round-trip intact. Empty content, `""` or empty bytes, creates an empty file. `read()` returns the file's bytes. Content over 10 MB throws `FILE_TOO_LARGE` before anything is sent, and reading a file over 10 MB throws 413 `FILE_TOO_LARGE`. Content over 1 MiB is sent without a timeout, like an upload, so pass `{ signal }` if you need to cancel it. Listing a missing directory throws 404 `FILE_NOT_FOUND`, a path you have no access to throws 403 `BLOCKED_PATH`, and paths are at most 256 characters long.

### Snapshots

`create()` returns `{ pending: true }` while the API is still generating a large snapshot. The snapshot then appears in `list()` on its own, usually within 2 minutes. Poll `list()` instead of calling `create()` again, because you can create one snapshot every 3 minutes and each one counts against your plan's daily snapshot quota.

`restore()` resolves to `{ pending: false }` when the restore has finished. A restore that takes longer than about 90 seconds resolves to `{ pending: true }` and keeps running. Follow it with `restoreState()`, and do not call `restore()` again. `restoreState()` reports `queued` or `running`, with the current `step`, while the restore runs. It then reports `success` or `error`, with a `code`, for 1 hour after the restore ends, and `none` when there was no recent restore. You can call it up to 30 times a minute.

```ts
const result = await api.apps.snapshots.create(appId);
if (!result.pending && result.url) {
  const zip = await api.downloadSnapshot(result.url); // a ReadableStream, never buffered
  await zip.pipeTo(Writable.toWeb(fs.createWriteStream("backup.zip")));
}

const [latest] = await api.apps.snapshots.list(appId);
const { pending } = await api.apps.snapshots.restore(appId, latest.name, latest.version_id);
let { state, code } = await api.apps.snapshots.restoreState(appId);
while (pending && (state === "queued" || state === "running")) {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  ({ state, code } = await api.apps.snapshots.restoreState(appId));
}
```

Every listed snapshot carries the `version_id` that `restore()` takes and a signed download `url`, under the API's own names. The `url` is valid for 1 hour. Only `create()` can come back without a link, when an API key without the `snapshots:read` scope gets `{ pending: false }` with `url` and `key` as `""`. Listings throw 503 `SNAPSHOTS_UNAVAILABLE` when snapshot storage cannot answer, so try again in about 30 seconds. `downloadSnapshot()` never sends your API key to the snapshot link, and it has no timeout, so pass a `signal` to cancel it.

A restore can fail with these errors:

- 400 `MISSING_PARAMETERS`, `INVALID_SNAPSHOT_ID` or `INVALID_VERSION_ID`, and for a database also `SNAPSHOT_DATABASE_MISMATCH`.
- 404 `APP_NOT_FOUND` or `DATABASE_NOT_FOUND`, `SNAPSHOT_NOT_FOUND`, `SNAPSHOT_RESTORE_FAILED`, `SNAPSHOT_CORRUPT`, `RESTORE_INTERRUPTED` or `CONTAINER_NOT_FOUND`.
- 409 `RESTORE_IN_PROGRESS` or `SNAPSHOT_IN_PROGRESS`, while another restore or a snapshot is running.
- 413 `PAYLOAD_TOO_LARGE`.
- 503 `CLUSTER_MAINTENANCE_TRY_LATER`, during maintenance.

While a restore runs, delete, start, stop, restart and snapshot create of that application or database throw 409 `RESTORE_IN_PROGRESS`, and `status()` reports `restoring: true`.

### Realtime

```ts
const controller = new AbortController();
for await (const event of api.apps.realtime(appId, { signal: controller.signal })) {
  if (event.event === "logs") console.log(event.stream, event.line); // "stdout" or "stderr"
  else if (event.event === "status") console.log(event.status.cpu); // always the full, merged state
  else console.log(event.data); // a code, such as REALTIME_DISCONNECTED
}
```

Every event has `event`, `id` and `data`, the raw text the API sent. The SDK checks the response before streaming, so 429 `REALTIME_MAX_CONNECTIONS` throws before the first event. When the connection drops, or the API asks the client to reconnect with `REALTIME_RECONNECT`, the stream reopens on its own, up to 3 times in a row. A `logs` or `status` event resets that count. Reopens are at least 5.5 seconds apart, because the API accepts one open every 5 seconds. After 3 reopens in a row, the loop throws `NETWORK_ERROR`. Opening the stream has the normal timeout, and reading it has none. The loop ends when the server closes the stream after 10 minutes, when the API sends `REALTIME_DISCONNECTED`, or when you `break` or abort. You can have at most 5 streams open per account, and an application at most 30.

### GitHub deploys

```ts
// A GitHub webhook. It returns the webhook URL, or "" after removing it with "@".
const url = await api.apps.deploys.setWebhook(appId, "ghp_xxx");

// Or the Square Cloud GitHub App
const repo = await api.apps.deploys.linkGithubApp(appId, "octocat/hello-world", "main");
console.log(repo.id, repo.full_name, repo.branch);

const { app, webhook } = await api.apps.deploys.current(appId); // {} when nothing is set up
await api.apps.deploys.unlinkGithubApp(appId);
```

Linking needs an API key with the `apps:deploy` scope and a connected GitHub account, or it throws 403 `GITHUB_NOT_CONNECTED`. The repository must be in a GitHub App installation of that GitHub account, or it throws 403 `REPOSITORY_NOT_AVAILABLE`, and the account needs write access to it, or it throws 403 `REPOSITORY_PERMISSION_REQUIRED`. A 502 `FAILED_TO_FETCH` means GitHub did not confirm the branch, and it is safe to try again. A repository and branch that another application already links, in any account, throw 409 `REPOSITORY_BRANCH_ALREADY_CONFIGURED`. The other application's id appears in `message` only when that application is yours. To link a different repository, unlink first, because linking an application that is already linked throws 400 `GIT_ALREADY_CONFIGURED`. Unlinking without a link throws 400 `GIT_NOT_CONFIGURED`. Link and unlink share a limit of 3 calls a minute.

## Errors

Every API, network and timeout failure throws a `SquareCloudAPIError` with `status`, `code`, `message`, `method`, `path` and `cause`. `path` is the URL path of the call, including the API's base path, and never includes the query string, so a signed link never leaks into logs. Two failures are not wrapped. Cancelling with a `signal` rejects with the signal's reason, and an upload path that cannot be opened throws the file-system error.

```ts
import { SquareCloudAPIError } from "@squarecloud/api";

try {
  await api.apps.start(appId);
} catch (error) {
  if (error instanceof SquareCloudAPIError && error.code === "MISSING_SCOPE") {
    console.error(error.message); // says which scope the key lacks
  }
}
```

- When no response arrives, `status` is `0` and `code` is `NETWORK_ERROR`, with the original error in `cause`, or `TIMEOUT`.
- Local checks stop a call before anything is sent. They throw with `status` `0` and `FILE_TOO_LARGE`, or with `INVALID_ID` for an id that is empty, `.` or `..`.
- `message` is the API's explanation, or the code when the API sent only a code. A failed response without a code, such as a proxy error page or a failed snapshot download, is `UNKNOWN_ERROR` with the message `HTTP <status>`. A successful response that is not valid JSON is `UNKNOWN_ERROR` with the message `Invalid JSON in HTTP <status> response`.
- A refused `start()`, `stop()` or `restart()` is 409 with only a code, so read `code` rather than `message`. The codes are `CONTAINER_ALREADY_STARTED`, `CONTAINER_ALREADY_STOPPED`, `CONTAINER_TEMPORARILY_SUSPENDED`, `CONTAINER_NOT_FOUND`, `CONTAINER_INSUFFICIENT_DISK_SPACE`, `CONTAINER_NETWORK_CONFLICT`, `ACTION_FAILED` and `RESTORE_IN_PROGRESS`. Starting a running application or database throws `CONTAINER_ALREADY_STARTED`, and stopping a stopped one throws `CONTAINER_ALREADY_STOPPED`.
- A successful HTTP status whose body is `{"status": "error"}` also throws. A 202 is never an error, so `SNAPSHOT_PROCESSING` and `SNAPSHOT_RESTORE_PROCESSING` resolve to `{ pending: true }`.
- A busy resource throws 409 `RESTORE_IN_PROGRESS` or `SNAPSHOT_IN_PROGRESS`, or `ENV_BUSY` when another request is changing the application's environment variables. Try again when the other operation ends.
- A missing, unknown or expired API key throws 401 `ACCESS_DENIED`.
- Every `ai.chat()` error, including authentication, rate limits and 5xx, follows the OpenAI format. `code` is the lowercase OpenAI code, such as `access_denied`, `upgrade_required`, `rate_limit_exceeded` or `database_unavailable`, or the error `type` when there is no code.
- The `ErrorCode` type lists the API's error codes, for autocompletion.

## Retries, timeouts and rate limits

- **Timeouts.** `timeoutMs`, 30 seconds by default, applies to each attempt. Calls that can take more than a minute have a timeout of at least 120 seconds, and a larger `timeoutMs` wins. These are `start()`, `stop()` and `restart()` of applications and databases, `databases.create()`, snapshot `create()` and `restore()`, and `ai.chat()`. A `timeoutMs` of `0` or less, `Infinity`, or `2^31` or more disables every timeout, including that minimum. Uploads, `files.write()` over 1 MiB and `downloadSnapshot()` have no timeout, so pass a `signal` to cancel them. `realtime()` is timed only until the stream opens. `ai.chat()` throws 503 `server_overloaded` when the completion takes longer than 90 seconds, and you can retry it yourself.
- **Retries.** The SDK retries only failures that are safe to repeat. These are network errors on GET calls, including a response cut off mid-read, a realtime open and a `downloadSnapshot()` before its response, and 503 `UPLOAD_BUSY`, `ANALYTICS_BUSY` and, on GET calls only, `DATABASE_UNAVAILABLE`. It retries up to `maxRetries` times, 2 by default. The wait starts at 500 ms and doubles each time, up to 8 seconds, with random jitter. It never retries timeouts, a 429, the AI's 503 `server_overloaded`, 503 `SNAPSHOTS_UNAVAILABLE` or `CLUSTER_MAINTENANCE_TRY_LATER`, or the 409 of a busy resource. A 503 `DATABASE_UNAVAILABLE` can arrive after a change was already applied, so the SDK retries it only on GET calls. Retry your own idempotent changes yourself.
- **Rate limits.** Every account has a global limit of requests per minute, set by its plan ([values](https://docs.squarecloud.app/en/api-reference/limitations-and-restrictions)). Going over it, or over a method's own limit, throws 429 `RATE_LIMITED` or `KEEP_CALM`. `RATE_LIMITED` can block the account, API key or IP for about 30 minutes. It replaces the older `RATE_LIMIT` and `RATE_LIMIT_EXCEEDED` codes. The API sends no `Retry-After` header, which is why the SDK never retries a 429.

## Development

```bash
pnpm install
pnpm biome ci . && pnpm typecheck && pnpm test   # offline, with a mocked transport
pnpm build                                        # writes lib/: ESM, CommonJS and type declarations
pnpm gen:spec                                     # regenerates spec/openapi.d.ts after spec/openapi.json changes
```

The offline suites, `test/transport.test.ts`, `test/streams.test.ts` and `test/conformance.test.ts`, never reach the API. The live suite runs all 69 operations against the real API.

```bash
SQUARECLOUD_API_KEY=... pnpm test:live
```

> **Warning:** the live suite creates and deletes real resources on the key's account: an application, a database and a workspace named `sdk-live-js-<timestamp>`. It is skipped without `SQUARECLOUD_API_KEY`, never runs in CI, and needs Node.js 22.2 or newer. Requests are spaced 2.1 seconds apart. Run the JS, Python and Go live suites one after another, never at the same time.

## Contributing

Issues and pull requests are welcome at [squarecloudofc/sdk-api-js](https://github.com/squarecloudofc/sdk-api-js).

## License

MIT, see [LICENSE](LICENSE).

## Authors

Maintained by [Square Cloud](https://squarecloud.app).

Contributors:

- João Otávio Stivi ([@JoaoOtavioS](https://github.com/JoaoOtavioS))
- João Gabriel Tonaco ([@joaotonaco](https://github.com/joaotonaco))
