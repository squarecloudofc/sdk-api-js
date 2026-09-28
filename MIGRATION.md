# Migrating from v5 to v6

v6 is a rewrite: one flat client, plain data instead of classes, ids as the first argument, and one error class. Most changes are mechanical.

## At a glance

| v5 | v6 |
|---|---|
| Classes with methods (`app.start()`) | Plain data; methods on the client (`api.apps.start(appId)`) |
| `Collection` | `Array` |
| Class fields in camelCase with `Date`s (`createdAt`, `modifiedAt`, `uptime`) | The API's own fields and values (`created_at` and `modified` as ISO strings, `uptime` in ms) |
| `Buffer` | `Uint8Array` (a `Buffer` is still accepted as input) |
| Mutations return `Promise<boolean>` (always `true`) | `Promise<void>`, or the data the API returns (`envs.*` → `EnvVars`, `deploys.setWebhook` → URL, `deploys.linkGithubApp` → `LinkedRepository`, `resetCredentials` → the password) |
| `SquareCloudAPIError extends TypeError` with `code` only | `extends Error` with `status`, `code`, `message` (the server's), `method`, `path`, `cause` |
| Events (`userUpdate`, `statusUpdate`, `logsUpdate`, `snapshotsUpdate`) and `api.cache`/`app.cache` | Removed: keep your own state |
| `api.api.request()` (the raw `APIService`) | Removed: every operation has a method |
| No timeout, no retries | 30 s timeout per attempt, retries for safe failures only (see [Behavior changes](#behavior-changes)) |
| Node.js >= 20 | Node.js >= 22, Deno, Bun, edge |
| `@squarecloud/api-types` | Types ship with the SDK (`import type { App } from "@squarecloud/api"`) |

## Construction and options

| v5 | v6 | Notes |
|---|---|---|
| `new SquareCloudAPI(key)` | `new SquareCloudAPI(key, { baseUrl?, timeoutMs?, maxRetries?, userAgent?, fetch? })` | An empty or whitespace-only key throws a `TypeError`. |
| `SquareCloudAPI.apiInfo` | `BASE_URL` and `{ baseUrl }` | `BASE_URL` = `https://api.squarecloud.app/v2`. |
| (none) | `timeoutMs` (30000) | Per attempt; held calls and `ai.chat` wait at least 120 s. `<= 0`, `Infinity` or `>= 2^31` disables every timeout, floors included. |
| (none) | `maxRetries` (2) | Network errors on GET and the listed 503 codes only; never 429. |
| (none) | `userAgent` | Replaces the whole header (default `squarecloud-sdk-js/<version>`). |
| (none) | `fetch` | Custom `fetch` (proxies, tracing, tests). |

## Method by method

| v5 | v6 | Notes |
|---|---|---|
| `api.user.get()` → `User` | `api.account.me()` | Returns `{ user, applications, databases }`. |
| `user.plan.expiresIn` | `new Date(user.plan.duration)` | A timestamp; `null` never expires. |
| `api.user.snapshots(scope)` | `api.account.snapshots({ scope })` | |
| `api.service.status()` | `api.service.status()` | New shape: `status`, `message`, `services`, `dependencies`... |
| `api.applications.get()` | `(await api.account.me()).applications` | |
| `api.applications.get(id)` / `fetch(id)` / `app.fetch()` | `api.apps.get(id)` | Also finds workspace-shared apps. |
| `app.isWebsite()` | `Boolean((await api.apps.get(id)).domain)` | |
| `api.applications.create(file)` | `api.apps.create(file, { signal })` | A path, `Blob`/`File` or `Uint8Array`; no timeout. |
| `api.applications.statusAll()` | `api.apps.statusAll({ workspaceId? })` | Plain `{ id, running, cpu?, ram? }` objects (v5 nested `cpu`/`ram` under `usage`). |
| `statusAll()[i].fetch()` (`SimpleApplicationStatus`, `SimpleDatabaseStatus`) | `api.apps.status(id)` / `api.databases.status(id)` | |
| `api.applications.domains()` / `loadBalancers()` | `api.apps.domains()` / `api.apps.loadBalancers()` | |
| `app.getStatus()` | `api.apps.status(id, { raw? })` | `cpu`, `ram`, `storage` and `network` are top-level (v5 nested them under `usage`); `uptime` is the start timestamp in ms (`null` when stopped), not a `Date`. |
| `app.getLogs()` | `api.apps.logs(id)` | |
| `app.getMetrics()` | `api.apps.metrics(id)` | Newest point first. |
| `app.realtime()` → raw `Response` | `api.apps.realtime(id, { signal })` | An async iterable of parsed events. |
| `app.start()` / `stop()` / `restart()` / `delete()` | `api.apps.start(id)` / `stop(id)` / `restart(id)` / `delete(id)` | |
| `app.commit(file, fileName)` | `api.apps.commit(id, file, { path?, filename?, signal? })` | |
| `app.files.list(path)` | `api.apps.files.list(id, path?)` | A missing directory throws 404 `FILE_NOT_FOUND` (it used to be an empty list). |
| `app.files.read(path)` → `Buffer \| undefined` | `api.apps.files.read(id, path)` → `Uint8Array` | Requested as base64 and decoded (v5 read a byte array). Empty bytes, never `undefined`, when the API sends no content. |
| `app.files.create(file, fileName, dir)` | `api.apps.files.write(id, \`${dir}/${fileName}\`, content)` | A string is the **content** (sent as plain text); v5 read it as a local path. Bytes are sent as base64. Empty content creates an empty file. |
| `app.files.edit(file, path)` | `api.apps.files.write(id, path, content)` | Same wire format as `write`: text for strings, base64 for bytes. |
| `app.files.move(path, newPath)` / `delete(path)` | `api.apps.files.move(id, path, to)` / `delete(id, path)` | |
| `app.envs.list()` | `api.apps.envs.get(id)` | |
| `app.envs.set(envs)` / `replace(envs)` / `delete(keys)` | `api.apps.envs.set(id, envs)` / `replace(id, envs)` / `delete(id, keys)` | Each returns the resulting variables. |
| `app.snapshots.list()` | `api.apps.snapshots.list(id)` | Items gain `name`, `runtime`, `origin`, `version_id` and a signed download `url`, all as the API sends them. |
| `app.snapshots.create()` | `api.apps.snapshots.create(id)` | `{ pending: true }` on 202 (v5 threw), else `{ pending: false, url, key }`. |
| `app.snapshots.download()` → `Buffer` | `const s = await api.apps.snapshots.create(id)`, then `if (!s.pending) await api.downloadSnapshot(s.url)` | A `ReadableStream`, nothing buffered. A pending (202) snapshot has no URL yet: v5 threw. |
| `snapshot.url` / `snapshot.download()` | `snapshot.url` / `api.downloadSnapshot(snapshot.url)` | The API's own signed URL (v5 built a wrong one from the caller's id). |
| `app.snapshots.restore({ snapshotId, versionId })` | `api.apps.snapshots.restore(id, name, versionId)` | Pass `name` and `version_id` of a listed snapshot. Any failure is 404 `SNAPSHOT_RESTORE_FAILED`. |
| `app.deploys.integrateGithubWebhook(token)` | `api.apps.deploys.setWebhook(id, token)` | Returns the webhook URL (`""` when removed with `"@"`). |
| `app.deploys.linkGithubApp({ repositoryName, repositoryBranch })` | `api.apps.deploys.linkGithubApp(id, repository, branch)` | Positional. Returns `{ id, full_name, branch }`. API keys are now accepted (scope `apps:deploy`); v5 needed a session JWT. |
| `app.deploys.unlinkGithubApp()` → `boolean` | `api.apps.deploys.unlinkGithubApp(id)` | Resolves to `void` (was `boolean`). `400 GIT_NOT_CONFIGURED` when nothing is linked. |
| `app.deploys.list()` → `Deployment[][]` | `api.apps.deploys.list(id)` → `DeployEvent[][]` | A failed deploy ends in `state: "error"` with `code` (and `message` when there are details); `source` is always `"git"`. |
| `app.deploys.current()` | `api.apps.deploys.current(id)` → `DeployCurrent` | `{}` when nothing is configured. |
| `app.deploys.webhookURL()` | `(await api.apps.deploys.current(id)).webhook` | |
| `app.network` (only on `WebsiteApplication`) | `api.apps.network` | Any app id; the API rejects non-web apps. |
| `network.setCustomDomain(domain)` | `api.apps.network.setDomain(id, domain)` | |
| `network.analytics({ start, end, contentType, ... })` | `api.apps.network.analytics(id, start, end, { content_type, ... })` | `null` for an empty window. |
| `network.errors({ start, end, include4xx })` | `api.apps.network.errors(id, start, end, { include_4xx })` | `null` for an empty window. |
| `network.logs({ start, end })` / `performance({ start, end })` | `api.apps.network.logs(id, start, end)` / `performance(id, start, end)` | |
| `network.dns()` / `purgeCache()` | `api.apps.network.dns(id)` / `purgeCache(id)` | |
| `api.databases.fetch(id)` / `db.fetch()` | `api.databases.get(id)` | |
| `api.databases.create(options)` / `statusAll()` | unchanged | `statusAll()` returns plain `{ id, running, cpu?, ram? }` objects. |
| `db.getStatus()` / `getMetrics()` | `api.databases.status(id, { raw? })` / `metrics(id)` | `ram` is RAM in use, e.g. `"120.4MB"` (a number with `raw`). Metrics come newest first. |
| `db.start()` / `stop()` / `update(changes)` / `delete()` | `api.databases.start(id)` / `stop(id)` / `update(id, changes)` / `delete(id)` | |
| `db.credentials.certificate()` | `api.databases.certificate(id)` | |
| `db.credentials.reset(type)` | `api.databases.resetCredentials(id, type)` | The new password (`""` for `"certificate"`). |
| `db.snapshots.list()` / `create()` / `download()` | `api.databases.snapshots.list(id)` / `create(id)` / `api.downloadSnapshot(url)` | `download()` as for apps: `create(id)`, then `downloadSnapshot(s.url)` when not pending. |
| `db.snapshots.restore(snapshotId, versionId)` | `api.databases.snapshots.restore(id, name, versionId)` | Pass `name` and `version_id` of a listed snapshot. |
| `api.workspaces.list()` / `fetch(id)` / `workspace.fetch()` | `api.workspaces.list()` / `get(id)` | |
| `api.workspaces.create({ name })` | `api.workspaces.create(name)` | Returns `WorkspaceCreated` (`{ id, name }`). |
| `api.workspaces.delete(id)` / `workspace.delete()` | `api.workspaces.delete(id)` | |
| `api.workspaces.leave(id)` / `workspace.leave()` | `api.workspaces.leave(id)` | |
| `api.workspaces.generateInviteCode()` | `api.workspaces.members.inviteCode()` | |
| `workspace.members.add(code, group)` | `api.workspaces.members.add(workspaceId, code, group)` | |
| `workspace.members.update(memberId, group)` / `remove(memberId)` | `api.workspaces.members.update(workspaceId, memberId, group)` / `remove(workspaceId, memberId)` | |
| `workspace.applications.add(appId)` / `remove(appId)` | `api.workspaces.apps.add(workspaceId, appId)` / `remove(workspaceId, appId)` | |
| (none) | `api.ai.chat(request)`, `api.downloadSnapshot(url)`, `BASE_URL` | New. |

## Types

Types ship with the SDK and mirror the API's field names. The main renames from `@squarecloud/api-types` and the v5 classes:

| v5 | v6 |
|---|---|
| `Application`, `WebsiteApplication`, `BaseApplication` | `App` (`api.apps.get()`), `AppSummary` (`account.me()`), `AppCreated` |
| `ApplicationStatus`, `SimpleApplicationStatus`, `SimpleDatabaseStatus` | `RuntimeStats` (`RuntimeStats<true>` with `{ raw: true }`), `StatusListItem` |
| `User` | `Account` (`{ user, applications, databases }`), `User`, `Plan` |
| `Snapshot`, `DatabaseSnapshot` | `Snapshot`, `SnapshotCreated` |
| `Deployment`, `DeploymentState` | `DeployEvent`, `DeployCurrent` (with `DeployRepository`), `LinkedRepository` |
| Network query objects | `AnalyticsFilters` (the optional filters; `start` and `end` are arguments) |
| `Workspace` | `Workspace`, `WorkspaceCreated`, `WorkspaceGroup` |
| `APIErrorCode` (runtime object) | `ErrorCode` (type only, no runtime cost; every code of the API's contract) |
| `APIEndpoint`, `APIEndpoints`, `APIMethod`, `APIRequestArgs`, `APIRequestOptions`, `APIResponse`, `QueryOrBody`, `ClientEvents`, `TypedEventEmitter`, `CollectionConstructor` | Removed (request plumbing, events and `Collection`) |

## Errors

```ts
// v5
catch (e) { if (e.code === "RATE_LIMIT_EXCEEDED") ... }

// v6
catch (e) {
  if (e instanceof SquareCloudAPIError && e.status === 429) {
    console.log(e.code, e.message); // KEEP_CALM "Please wait 5 seconds..." or RATE_LIMITED
  }
}
```

- Synthetic codes are gone (`RATE_LIMIT_EXCEEDED`, `PAYLOAD_TOO_LARGE`, `SERVER_UNAVAILABLE`, `UNKNOWN_ERROR_<status>`): the API's real code surfaces (`RATE_LIMITED`, `KEEP_CALM`, `DAILY_SNAPSHOTS_LIMIT_REACHED`, `FILE_TOO_LARGE`...).
- No response: `status: 0` with `NETWORK_ERROR` (the cause in `cause`) or `TIMEOUT`. A body without a code is `UNKNOWN_ERROR` with the real `status` and the message `HTTP <status>`.
- `instanceof TypeError` is no longer true for API errors.
- `APIKEY_EXPIRED` is gone: an expired key is 401 `ACCESS_DENIED`, like an unknown one.
- `ai.chat()` errors, auth and rate limits included, carry the lowercase OpenAI code (`access_denied`, `rate_limit_exceeded`, ...).
- A refused `start`/`stop`/`restart` is 409 with a code only: `CONTAINER_ALREADY_STARTED`, `CONTAINER_ALREADY_STOPPED`, `CONTAINER_TEMPORARILY_SUSPENDED`, `CONTAINER_NOT_FOUND`, `CONTAINER_INSUFFICIENT_DISK_SPACE`, `CONTAINER_NETWORK_CONFLICT` or `ACTION_FAILED`.

## Behavior changes

- Calls time out: 30 s per attempt by default (v5 had no timeout), at least 120 s for calls the server holds open. Set `timeoutMs: 0` for none.
- `files.write()` treats a string as the content and sends it as plain text; bytes go as base64, binary-safe, and empty content creates an empty file (same wire format as the Python and Go SDKs). `files.read()` asks for base64 and decodes it.
- `files.list()` of a missing directory throws 404 `FILE_NOT_FOUND` instead of returning `[]`.
- `snapshots.create()` returns `{ pending: true }` on 202 instead of throwing.
- String results are never `undefined`: `setWebhook` and `resetCredentials("certificate")` return `""` when the API sends none; `deploys.current()` returns `{}`.
- `realtime()` reconnects on dropped connections and on `REALTIME_RECONNECT` (up to 3 times in a row, at most one open per 5.5 s).
- Retries: network errors on GET and 503 `UPLOAD_BUSY`/`ANALYTICS_BUSY` (plus `DATABASE_UNAVAILABLE` on GET), with backoff. 429 is never retried. `DATABASE_UNAVAILABLE` can come after a mutation was applied: retry your idempotent mutations yourself.
- Empty, `.` and `..` ids fail locally with `INVALID_ID`.
- Query values that are `undefined`, `""` or `false` are not sent.
