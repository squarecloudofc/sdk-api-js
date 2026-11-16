# Migrating from v5 to v6

v6 is a rewrite. It has one flat client, returns plain data instead of classes, takes ids as the first argument and throws one error class. Most changes are mechanical.

## At a glance

| v5 | v6 |
|---|---|
| Classes with methods, such as `app.start()` | Plain data, with the methods on the client, such as `api.apps.start(appId)` |
| `Collection` | `Array` |
| Class fields in camelCase with `Date`s, such as `createdAt`, `modifiedAt` and `uptime` | The API's own fields and values: `created_at` and `modified` as ISO strings, and `uptime` in milliseconds |
| `Buffer` | `Uint8Array`. A `Buffer` is still accepted as input. |
| Mutations return `Promise<boolean>`, which is always `true` | `Promise<void>`, or the data the API returns: `envs.*` return `EnvVars`, `deploys.setWebhook` the URL, `deploys.linkGithubApp` a `LinkedRepository`, and `resetCredentials` the password |
| `SquareCloudAPIError extends TypeError`, with `code` only | `SquareCloudAPIError extends Error`, with `status`, `code`, `message` (the API's explanation), `method`, `path` and `cause` |
| Events (`userUpdate`, `statusUpdate`, `logsUpdate`, `snapshotsUpdate`) and `api.cache`/`app.cache` | Removed. Keep your own state. |
| `api.api.request()`, the raw `APIService` | Removed, because every operation has a method |
| No timeout and no retries | A 30-second timeout per attempt, and retries for safe failures only. See [Behavior changes](#behavior-changes). |
| Node.js 20 or newer | Node.js 22 or newer, Deno, Bun and edge runtimes |
| `@squarecloud/api-types` | Types ship with the SDK, as in `import type { App } from "@squarecloud/api"` |

## Construction and options

| v5 | v6 | Notes |
|---|---|---|
| `new SquareCloudAPI(key)` | `new SquareCloudAPI(key, { baseUrl?, timeoutMs?, maxRetries?, userAgent?, fetch? })` | An empty or whitespace-only key throws a `TypeError`. |
| `SquareCloudAPI.apiInfo` | `BASE_URL` and `{ baseUrl }` | `BASE_URL` is `https://api.squarecloud.app/v2`. |
| (none) | `timeoutMs`, 30000 by default | The timeout of each attempt. Calls that can take more than a minute, including `ai.chat`, get at least 120 seconds. A value of `0` or less, `Infinity`, or `2^31` or more disables every timeout, including that minimum. |
| (none) | `maxRetries`, 2 by default | Only network errors on GET calls and the listed 503 codes are retried, and a 429 never is. |
| (none) | `userAgent` | Replaces the whole header. The default is `squarecloud-sdk-js/<version>`. |
| (none) | `fetch` | A custom `fetch`, for example for a proxy, tracing or tests. |

## Method by method

| v5 | v6 | Notes |
|---|---|---|
| `api.user.get()` → `User` | `api.account.me()` | Returns `{ user, applications, databases }`. |
| `user.plan.expiresIn` | `new Date(user.plan.duration)` | `duration` is a timestamp. It is `null` when the account has no active plan. |
| `api.user.snapshots(scope)` | `api.account.snapshots({ scope })` | |
| `api.service.status()` | `api.service.status()` | The result has a new shape, with `status`, `message`, `services`, `dependencies` and more. |
| `api.applications.get()` | `(await api.account.me()).applications` | |
| `api.applications.get(id)` / `fetch(id)` / `app.fetch()` | `api.apps.get(id)` | It also finds applications shared with you through a workspace. |
| `app.isWebsite()` | `Boolean((await api.apps.get(id)).domain)` | |
| `api.applications.create(file)` | `api.apps.create(file, { signal })` | Takes a path, a `Blob` or `File`, or a `Uint8Array`. Uploads have no timeout. |
| `api.applications.statusAll()` | `api.apps.statusAll({ workspaceId? })` | Returns plain `{ id, running, cpu?, ram? }` objects. v5 nested `cpu` and `ram` under `usage`. |
| `statusAll()[i].fetch()` (`SimpleApplicationStatus`, `SimpleDatabaseStatus`) | `api.apps.status(id)` / `api.databases.status(id)` | |
| `api.applications.domains()` / `loadBalancers()` | `api.apps.domains()` / `api.apps.loadBalancers()` | |
| `app.getStatus()` | `api.apps.status(id, { raw? })` | `cpu`, `ram`, `storage` and `network` are top-level fields, where v5 nested them under `usage`. `uptime` is the start time in milliseconds, or `null` when stopped, not a `Date`. |
| `app.getLogs()` | `api.apps.logs(id)` | |
| `app.getMetrics()` | `api.apps.metrics(id)` | The newest point comes first. |
| `app.realtime()` → raw `Response` | `api.apps.realtime(id, { signal })` | Returns an async iterable of parsed events. |
| `app.start()` / `stop()` / `restart()` / `delete()` | `api.apps.start(id)` / `stop(id)` / `restart(id)` / `delete(id)` | |
| `app.commit(file, fileName)` | `api.apps.commit(id, file, { path?, filename?, signal? })` | |
| `app.files.list(path)` | `api.apps.files.list(id, path?)` | A missing directory throws 404 `FILE_NOT_FOUND`. It used to return an empty list. |
| `app.files.read(path)` → `Buffer \| undefined` | `api.apps.files.read(id, path)` → `Uint8Array` | The SDK requests base64 and decodes it, where v5 read a byte array. It returns empty bytes, never `undefined`, when the API sends no content. |
| `app.files.create(file, fileName, dir)` | `api.apps.files.write(id, \`${dir}/${fileName}\`, content)` | A string is the file **content**, sent as plain text. v5 read it as a local path. Bytes are sent as base64, and empty content creates an empty file. |
| `app.files.edit(file, path)` | `api.apps.files.write(id, path, content)` | The same as `write`: a string is sent as text, and bytes as base64. |
| `app.files.move(path, newPath)` / `delete(path)` | `api.apps.files.move(id, path, to)` / `delete(id, path)` | |
| `app.envs.list()` | `api.apps.envs.get(id)` | |
| `app.envs.set(envs)` / `replace(envs)` / `delete(keys)` | `api.apps.envs.set(id, envs)` / `replace(id, envs)` / `delete(id, keys)` | Each returns the variables after the change. |
| `app.snapshots.list()` | `api.apps.snapshots.list(id)` | Items gain `name`, `runtime`, `origin`, `version_id` and a signed download `url`, all as the API sends them. |
| `app.snapshots.create()` | `api.apps.snapshots.create(id)` | Returns `{ pending: true }` on a 202, where v5 threw, and `{ pending: false, url, key }` otherwise. `url` and `key` are `""` for an API key without the `snapshots:read` scope. |
| `app.snapshots.download()` → `Buffer` | `const s = await api.apps.snapshots.create(id)`, then `if (!s.pending && s.url) await api.downloadSnapshot(s.url)` | Returns a `ReadableStream` and buffers nothing. A pending snapshot has no URL yet, where v5 threw. |
| `snapshot.url` / `snapshot.download()` | `snapshot.url` / `api.downloadSnapshot(snapshot.url)` | The API's own signed URL. v5 built a wrong one from the caller's id. |
| `app.snapshots.restore({ snapshotId, versionId })` | `api.apps.snapshots.restore(id, name, versionId)` | Pass the `name` and `version_id` of a listed snapshot. It resolves to `{ pending }`, so follow a pending restore with `restoreState(id)`. The failures are listed under [Snapshots](README.md#snapshots). |
| `app.deploys.integrateGithubWebhook(token)` | `api.apps.deploys.setWebhook(id, token)` | Returns the webhook URL, or `""` after removing it with `"@"`. |
| `app.deploys.linkGithubApp({ repositoryName, repositoryBranch })` | `api.apps.deploys.linkGithubApp(id, repository, branch)` | Takes positional arguments and returns `{ id, full_name, branch }`. It now accepts API keys with the `apps:deploy` scope, where v5 needed a session token. |
| `app.deploys.unlinkGithubApp()` → `boolean` | `api.apps.deploys.unlinkGithubApp(id)` | Resolves to `void` instead of a `boolean`. Throws 400 `GIT_NOT_CONFIGURED` when nothing is linked. |
| `app.deploys.list()` → `Deployment[][]` | `api.apps.deploys.list(id)` → `DeployEvent[][]` | A failed deploy ends in an event with `state: "error"` and a `code`, plus a `message` when there are details. `source` is always `"git"`. |
| `app.deploys.current()` | `api.apps.deploys.current(id)` → `DeployCurrent` | Returns `{}` when nothing is set up. |
| `app.deploys.webhookURL()` | `(await api.apps.deploys.current(id)).webhook` | |
| `app.network`, only on `WebsiteApplication` | `api.apps.network` | Takes any application id, and the API refuses applications that are not websites. |
| `network.setCustomDomain(domain)` | `api.apps.network.setDomain(id, domain)` | |
| `network.analytics({ start, end, contentType, ... })` | `api.apps.network.analytics(id, start, end, { content_type, ... })` | Returns `null` for a window with no traffic. |
| `network.errors({ start, end, include4xx })` | `api.apps.network.errors(id, start, end, { include_4xx })` | Returns `null` for a window with no traffic. |
| `network.logs({ start, end })` / `performance({ start, end })` | `api.apps.network.logs(id, start, end)` / `performance(id, start, end)` | |
| `network.dns()` / `purgeCache()` | `api.apps.network.dns(id)` / `purgeCache(id)` | |
| `api.databases.fetch(id)` / `db.fetch()` | `api.databases.get(id)` | |
| `api.databases.create(options)` / `statusAll()` | unchanged | `statusAll()` returns plain `{ id, running, cpu?, ram? }` objects. |
| `db.getStatus()` / `getMetrics()` | `api.databases.status(id, { raw? })` / `metrics(id)` | `ram` is the memory in use, such as `"120.4MB"`, or a number with `raw`. The newest metrics point comes first. |
| `db.start()` / `stop()` / `update(changes)` / `delete()` | `api.databases.start(id)` / `stop(id)` / `update(id, changes)` / `delete(id)` | |
| `db.credentials.certificate()` | `api.databases.certificate(id)` | |
| `db.credentials.reset(type)` | `api.databases.resetCredentials(id, type)` | Returns the new password, or `""` for `"certificate"`. |
| `db.snapshots.list()` / `create()` / `download()` | `api.databases.snapshots.list(id)` / `create(id)` / `api.downloadSnapshot(url)` | Replace `download()` as for applications: call `create(id)`, then `downloadSnapshot(s.url)` when it is not pending. |
| `db.snapshots.restore(snapshotId, versionId)` | `api.databases.snapshots.restore(id, name, versionId)` | Pass the `name` and `version_id` of a listed snapshot. It resolves to `{ pending }`, as for applications. |
| `api.workspaces.list()` / `fetch(id)` / `workspace.fetch()` | `api.workspaces.list()` / `get(id)` | |
| `api.workspaces.create({ name })` | `api.workspaces.create(name)` | Returns a `WorkspaceCreated`, `{ id, name }`. |
| `api.workspaces.delete(id)` / `workspace.delete()` | `api.workspaces.delete(id)` | |
| `api.workspaces.leave(id)` / `workspace.leave()` | `api.workspaces.leave(id)` | |
| `api.workspaces.generateInviteCode()` | `api.workspaces.members.inviteCode()` | |
| `workspace.members.add(code, group)` | `api.workspaces.members.add(workspaceId, code, group)` | |
| `workspace.members.update(memberId, group)` / `remove(memberId)` | `api.workspaces.members.update(workspaceId, memberId, group)` / `remove(workspaceId, memberId)` | |
| `workspace.applications.add(appId)` / `remove(appId)` | `api.workspaces.apps.add(workspaceId, appId)` / `remove(workspaceId, appId)` | |
| (none) | `api.ai.chat(request)`, `api.downloadSnapshot(url)`, `BASE_URL` | New in v6. |

## Types

Types ship with the SDK and use the API's field names. These are the main renames from `@squarecloud/api-types` and the v5 classes:

| v5 | v6 |
|---|---|
| `Application`, `WebsiteApplication`, `BaseApplication` | `App` from `api.apps.get()`, `AppSummary` from `account.me()`, and `AppCreated` |
| `ApplicationStatus`, `SimpleApplicationStatus`, `SimpleDatabaseStatus` | `RuntimeStats` (`RuntimeStats<true>` with `{ raw: true }`) and `StatusListItem` |
| `User` | `Account` (`{ user, applications, databases }`), `User` and `Plan` |
| `Snapshot`, `DatabaseSnapshot` | `Snapshot` and `SnapshotCreated` |
| `Deployment`, `DeploymentState` | `DeployEvent`, `DeployCurrent` (with `DeployRepository`) and `LinkedRepository` |
| Network query objects | `AnalyticsFilters`, which holds only the optional filters, because `start` and `end` are arguments |
| `Workspace` | `Workspace`, `WorkspaceCreated` and `WorkspaceGroup` |
| `APIErrorCode`, a runtime object | `ErrorCode`, a type with no runtime cost that lists the API's error codes |
| `APIEndpoint`, `APIEndpoints`, `APIMethod`, `APIRequestArgs`, `APIRequestOptions`, `APIResponse`, `QueryOrBody`, `ClientEvents`, `TypedEventEmitter`, `CollectionConstructor` | Removed, together with the request plumbing, events and `Collection` |

## Errors

```ts
// v5
catch (e) { if (e.code === "RATE_LIMIT_EXCEEDED") ... }

// v6
catch (e) {
  if (e instanceof SquareCloudAPIError && e.status === 429) {
    console.log(e.code, e.message); // KEEP_CALM "Please wait 5 seconds...", or RATE_LIMITED
  }
}
```

- The codes v5 made up are gone: `RATE_LIMIT_EXCEEDED`, `PAYLOAD_TOO_LARGE`, `SERVER_UNAVAILABLE` and `UNKNOWN_ERROR_<status>`. The API's real code comes through instead, such as `RATE_LIMITED`, `KEEP_CALM`, `DAILY_SNAPSHOTS_LIMIT_REACHED` or `FILE_TOO_LARGE`.
- When no response arrives, `status` is `0` and `code` is `NETWORK_ERROR`, with the original error in `cause`, or `TIMEOUT`. A failed response without a code is `UNKNOWN_ERROR` with the real `status` and the message `HTTP <status>`.
- `instanceof TypeError` is no longer true for API errors.
- `APIKEY_EXPIRED` is gone. An expired key throws 401 `ACCESS_DENIED`, like an unknown one.
- `ai.chat()` errors, including authentication and rate limits, carry the lowercase OpenAI code, such as `access_denied` or `rate_limit_exceeded`.
- A refused `start`, `stop` or `restart` is 409 with only a code: `CONTAINER_ALREADY_STARTED`, `CONTAINER_ALREADY_STOPPED`, `CONTAINER_TEMPORARILY_SUSPENDED`, `CONTAINER_NOT_FOUND`, `CONTAINER_INSUFFICIENT_DISK_SPACE`, `CONTAINER_NETWORK_CONFLICT` or `ACTION_FAILED`.

## Behavior changes

- Calls time out. The timeout is 30 seconds per attempt by default, where v5 had none, and at least 120 seconds for calls that can take more than a minute. Set `timeoutMs: 0` to turn timeouts off.
- `files.write()` treats a string as the content and sends it as plain text. Bytes are sent as base64, so binary files survive, and empty content creates an empty file. This is the same format the Python and Go SDKs use. `files.read()` requests base64 and decodes it.
- `files.list()` of a missing directory throws 404 `FILE_NOT_FOUND` instead of returning `[]`.
- `snapshots.create()` returns `{ pending: true }` on a 202 instead of throwing.
- String results are never `undefined`. `setWebhook` and `resetCredentials("certificate")` return `""` when the API sends none, and `deploys.current()` returns `{}`.
- `realtime()` reopens the stream when the connection drops and when the API sends `REALTIME_RECONNECT`, up to 3 times in a row and at least 5.5 seconds apart.
- The SDK retries network errors on GET calls and 503 `UPLOAD_BUSY` and `ANALYTICS_BUSY`, plus `DATABASE_UNAVAILABLE` on GET calls, with backoff. It never retries a 429. `DATABASE_UNAVAILABLE` can arrive after a change was applied, so retry your own idempotent changes yourself.
- An id that is empty, `.` or `..` throws `INVALID_ID` before anything is sent.
- Query values that are `undefined`, `""` or `false` are not sent.
