# @squarecloud/api

## 6.0.0

### Major Changes

- v6: rewrite on the house shape (flat client, one private `request()`, plain data), covering all 67 SDK-relevant operations of the Square Cloud API. See MIGRATION.md for the old → new table.

  **Breaking**

  - Classes (`Application`, `WebsiteApplication`, `Database`, `Workspace`, `User`, `Snapshot`, `DatabaseSnapshot`, `Deployment`, the status classes, `Collection`) are gone: methods live on the client and take the id first (`app.start()` → `api.apps.start(appId)`), and responses are plain objects with the API's field names and values (`created_at` strings instead of `createdAt` dates, `cpu`/`ram` no longer nested under `usage`).
  - Groups renamed: `api.user` → `api.account` (`get()` → `me()`), `api.applications` → `api.apps` (`fetch()`/`get(id)` → `get(id)`), `databases.fetch()` → `databases.get()`, `workspaces.fetch()` → `workspaces.get()`, `generateInviteCode()` → `workspaces.members.inviteCode()`, `workspace.applications` → `api.workspaces.apps`.
  - Renamed: `getStatus`/`getLogs`/`getMetrics` → `status`/`logs`/`metrics`, `integrateGithubWebhook` → `deploys.setWebhook`, `setCustomDomain` → `network.setDomain`, `envs.list` → `envs.get`, `files.create`/`files.edit` → `files.write(id, path, content)`, `credentials.certificate`/`reset` → `databases.certificate`/`resetCredentials`, `workspaces.create({ name })` → `workspaces.create(name)`.
  - Mutations resolve to `void` instead of an always-`true` boolean, unless the API returns data (`envs.*` return the variables, `deploys.setWebhook` the URL, `deploys.linkGithubApp` the linked repository, `databases.resetCredentials` the password itself instead of `{ password }`). String results (`logs`, `certificate`, `inviteCode`, `setWebhook`, `resetCredentials`) are `""`, never `undefined`, when the API sends none; `files.read()` is then an empty `Uint8Array`, and `deploys.current()`/`deploys.linkGithubApp()` are `{}`.
  - `SquareCloudAPIError` extends `Error` (not `TypeError`) and carries `status`, `code`, the server's `message`, `method`, `path` and `cause`; synthetic codes are gone (`RATE_LIMIT_EXCEEDED`, `PAYLOAD_TOO_LARGE`, `SERVER_UNAVAILABLE`, `UNKNOWN_ERROR_<status>`, `SNAPSHOT_DOWNLOAD_FAILED`): the API's own code surfaces, and a body without one is `UNKNOWN_ERROR` with the real status and the message `HTTP <status>`.
  - Calls time out: 30 s per attempt by default (v5 never timed out), at least 120 s for calls the server holds open.
  - `files.write()` treats a string as the file content (v5 read it as a local path) and sends it as plain text; bytes are sent as base64 (`encoding: "base64"`), binary-safe, and empty content (`""` or empty bytes) creates an empty file (same wire format as the Python and Go SDKs).
  - `files.read()` returns `Uint8Array` (was `Buffer`): it asks for `?encoding=base64` and decodes the answer. `files.list()` of a missing directory throws 404 `FILE_NOT_FOUND` (it returned `[]`).
  - `snapshots.create()` returns `{ pending: true }` on 202 instead of throwing; `snapshots.download()` is replaced by `api.downloadSnapshot(url)`, which returns a `ReadableStream`. Listed snapshots carry the API's `version_id` (what `restore()` takes) and signed download `url`, passed through under those names.
  - `DeployEvent.state` is `"pending" | "clone" | "commit" | "restarting" | "success" | "error"`; an `error` event carries `code` (and `message` when there are details), and `source` is always `"git"`.
  - `APIKEY_EXPIRED` is gone: an expired key is 401 `ACCESS_DENIED`, like an unknown one. On `ai.chat()` every error, auth, rate limits and 5xx included, carries its lowercase OpenAI code (`access_denied`, `rate_limit_exceeded`, `database_unavailable`, ...).
  - `AppCreated.domain` is the full host (there is no `subdomain`); `Workspace.members[].name` and `DatabaseCreated.certificate` can be `null`; `RuntimeStats.ram` is the RAM in use as a string such as `"120.4MB"` (a number of MB with `raw`).
  - `realtime()` returns an async iterable of parsed events instead of the raw `Response`.
  - `snapshots.restore(id, name, versionId)` takes positional strings (apps and databases): the `name` and `version_id` of a listed snapshot. Any failure is 404 `SNAPSHOT_RESTORE_FAILED`.
  - `deploys.linkGithubApp({ repositoryName, repositoryBranch })` → `apps.deploys.linkGithubApp(id, repository, branch)` (positional); `unlinkGithubApp()` → `unlinkGithubApp(id)`, which resolves to `void` (was `boolean`). Both now accept API keys (scope `apps:deploy`); v5 needed a session JWT.
  - Upload parts are always sent as `application/octet-stream`, whatever a `File`'s own type (the same bytes on the wire as the Python and Go SDKs).
  - Network methods take the window as arguments: `analytics(id, start, end, filters?)`, `errors(id, start, end, { include_4xx })`, `logs(id, start, end)`, `performance(id, start, end)`; filters use the API names (`content_type`, `include_4xx`); empty analytics windows return `null` (was `{}`); `api.apps.network` takes any app id (it was only on `WebsiteApplication`).
  - Removed: events (`on`/`off`, `TypedEventEmitter`, `ClientEvents`), `api.cache`/`app.cache`, `api.api.request()` and the request plumbing types (`APIEndpoint`, `APIEndpoints`, `APIMethod`, `APIRequestArgs`, `APIRequestOptions`, `APIResponse`, `QueryOrBody`), `CollectionConstructor`, `isWebsite()`, `webhookURL()`, `Snapshot#download()`, `SquareCloudAPI.apiInfo` (use `BASE_URL`), and the `APIErrorCode` runtime object (now the type-only `ErrorCode`).
  - Requires Node.js 22+ (also runs on Deno, Bun and edge runtimes).

  **Added**: API-key access to `apps.deploys.linkGithubApp`/`unlinkGithubApp` (scope `apps:deploy`) and the GitHub App error codes (with 403 `REPOSITORY_PERMISSION_REQUIRED` and 502 `FAILED_TO_FETCH`; the cross-account 409 `REPOSITORY_BRANCH_ALREADY_CONFIGURED` names the other app only in `message`, and only when it is yours), an `ErrorCode` union with every code of the API's contract (among them 403 `MISSING_SCOPE`/`RESOURCE_NOT_ALLOWED`, 503 `DATABASE_UNAVAILABLE`, 400 `INVALID_ENCODING`/`INVALID_CONTENT`/`INVALID_FILTER`, 413 `FILE_TOO_LARGE`, 404 `SNAPSHOT_RESTORE_FAILED`, 403 `GITHUB_NOT_CONNECTED`; a conformance test fails when one is missing) plus `RATE_LIMITED` (the deprecated `RATE_LIMIT`/`RATE_LIMIT_EXCEEDED` stay; no 429 is retried), the code-only 409 of start/stop/restart (`CONTAINER_ALREADY_STARTED`, `CONTAINER_ALREADY_STOPPED`, `CONTAINER_TEMPORARILY_SUSPENDED`, `CONTAINER_NOT_FOUND`, `CONTAINER_INSUFFICIENT_DISK_SPACE`, `CONTAINER_NETWORK_CONFLICT`, `ACTION_FAILED`), `DatabaseCreate.memory` documented as integer MB (400 `INVALID_MEMORY` otherwise), metrics documented as newest first, `RealtimeStatus.cpuLimit` as a number of cores, the analytics `provider` filter as the exact `"NAME (ASN)"` bucket value (400 `INVALID_FILTER` otherwise), `api.ai.chat()`, `downloadSnapshot()`, `BASE_URL`, `statusAll({ workspaceId })`, `status(id, { raw })`, `commit(id, file, { path, filename, signal })`, `files.write(id, path, content, { signal })`, `create(file, { signal })`, `Snapshot.runtime/origin/version_id/url`, `DeployEvent.source/code/message`, exported types for every request and response (`App`, `DeployCurrent`, `AnalyticsFilters`, `LinkedRepository`, ...), client options `baseUrl`, `timeoutMs` (at least 120 s for calls the server holds open, `ai.chat` included, whose gateway answers 503 `server_overloaded` past its 90 s deadline, never retried by the SDK; `<= 0`, `Infinity` or `>= 2^31` disables every timeout, floors included), `maxRetries`, `userAgent`, `fetch`, retries with backoff for network errors on GET (including `downloadSnapshot`) and 503 `UPLOAD_BUSY`/`ANALYTICS_BUSY` (plus `DATABASE_UNAVAILABLE` on GET only: it can come after a mutation was applied, so callers retry their own idempotent mutations); `realtime()` honors `REALTIME_RECONNECT` (reads on to the server's close, then reopens at most once per 5.5 s; system codes match by prefix); empty, `.` and `..` ids fail locally with `INVALID_ID`; `""` and `false` query values are not sent; `downloadSnapshot()` sends only the User-Agent; a live suite (`pnpm test:live`, never in CI) covers all 67 operations; `author` is Square Cloud, the people are `contributors`.

  **Fixed**: binary file writes were corrupted; 202 snapshots threw; snapshot downloads ignored HTTP errors, and listed-snapshot URLs were built from the caller's id (the helper is gone); errors dropped the status, the server message and the network cause; 413/429/502/504 codes were replaced; `Collection.map()`/`first(n)` repeated the first entry; `applications.get(id)` missed workspace-shared apps and cost a `/users/me` call; `realtime()` skipped the status check and User-Agent; `DeployEvent` lacked `source` and the `error` event's `code`/`message`; `logs()`, `certificate()` and `inviteCode()` threw a `TypeError` on a 2xx without `response`. Types checked against the live API: `domain`/`custom` of apps, app summaries and workspace apps are optional (the API omits them when unset), `AppCreated` has `domain` and `cluster`, performance percentiles (and colo `city`/`country`) can be `null`, and `FileEntry.size`/`lastModified` are optional (a directory entry can omit them) with `lastModified` possibly fractional or `null`; workspace ids are 32 hex (older ones 40).

## 5.0.0

### Major Changes

- 9a4e696: Sync with the Square Cloud API contract changes from the last 3 months.

  **Breaking**

  - Removed `SquareCloudAPI#users` — use `SquareCloudAPI#user`.
  - Removed `BaseApplication#backup` and `#backups` — use `Application#snapshots`.
  - Removed the `Backup` class alias — use `Snapshot`.
  - `applications.create()` return type now matches the live API: `language: { name, version }` plus `cpu`, and optional `description`/`subdomain`.
  - `network.dns()` now returns the API's array of DNS records (`{ type, name, value, status }`) instead of the removed `ownership`/`ssl` object (via `@squarecloud/api-types`).

  **Added**

  - `client.applications.domains()`: lists every domain configured across the account's applications.
  - `client.applications.loadBalancers()`: lists custom-domain load balancers with the plan's per-domain application limit.
  - `application.network.analytics()`: optional drill-down filters (`country`, `ip`, `path`, `status`, `os`, `browser`, `protocol`, `referer`, `provider`, `contentType`, `bot`).
  - Re-export of `APIErrorCode` with the standardized error codes; pre-standardization names remain as `@deprecated` aliases.

  **Docs**

  - Updated JSDoc with current rate limits and behavior (logs, snapshot quotas, realtime SSE connection limits and TTL, `402 UPGRADE_REQUIRED` on `user.snapshots()` for accounts without an active paid plan) and explicit `node:buffer` imports so `Buffer` resolves in every TypeScript setup.

## 4.0.1

### Patch Changes

- f88b29c: drop paths argument from purgeCache() and bump api-types to v2

## 4.0.0

### Major Changes

- dd45d75: # v4.0.0 — New modules + api-types 1.0.0 migration

  This release adds Databases, Workspaces, Environment Variables, Metrics, Realtime SSE, GitHub App deploy, Snapshot restore, and the full edge analytics suite (errors/logs/performance/purge_cache). Type definitions are now sourced from `@squarecloud/api-types@1.0.0`.

  ## Breaking changes — migration guide

  | 3.x                                          | 4.x                                                                                       |
  | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
  | `client.users.*`                             | `client.user.*`                                                                           |
  | `app.backup` / `app.backups`                 | `app.snapshots`                                                                           |
  | `Backup` re-export                           | `Snapshot`                                                                                |
  | `app.deploys.list()` flat array              | returns `Deployment[][]` (one timeline per deploy — `.flat()` to mimic)                   |
  | `Deployment.id` `` `git-${string}` ``        | plain `string` (commit SHA-1, 40 hex)                                                     |
  | `app.network.dns()` array                    | single object `{ ownership, ssl }`                                                        |
  | `app.network.analytics()` no-arg             | requires `{ start, end }` (ISO or `Date`)                                                 |
  | `app.network.purgeCache()`                   | `purgeCache(paths?: string[])` — `[]` purges all                                          |
  | `app.custom === undefined`                   | `app.custom === null`                                                                     |
  | `workspace.members` / `.applications` (data) | renamed to `memberList` / `applicationList`; new `.members` / `.applications` are modules |
  | Node 18                                      | Node 20+                                                                                  |

  ## New

  - `client.databases.{fetch, create, statusAll}` + full `Database` class (`start`, `stop`, `update`, `delete`, `getStatus`, `getMetrics`)
    - `Database.credentials.{certificate, reset}` — TLS certificate + password/cert rotation
    - `Database.snapshots.{list, create, download, restore}` — separate `DatabaseSnapshot` class so download URL targets the correct scope
  - `client.workspaces.{list, fetch, create, delete, leave, generateInviteCode}` + full `Workspace` class (`delete`, `leave`)
    - `Workspace.members.{add, update, remove}` — invite-code flow with role tiers
    - `Workspace.applications.{add, remove}` — share / unshare apps
  - `client.service.status()` — aggregate platform health
  - `Application.envs.{list, set, replace, delete}` — environment variables
  - `Application.getMetrics()` — 24h CPU/RAM/network time series (288 points)
  - `Application.realtime()` — Server-Sent Events stream
  - `Application.snapshots.restore({ snapshotId, versionId })`
  - `Application.deploys.linkGithubApp(options)` / `unlinkGithubApp()` / `current()` — GitHub App linkage
  - `Application.network.{errors, logs, performance, purgeCache}` — edge analytics + cache management
  - `client.user.snapshots(scope)` — list user-scoped snapshots
  - New fields: `User.databases`, `User.locale`, `User.createdAt`, `BaseApplication.domain`, `BaseApplication.custom`, `BaseApplication.createdAt`
  - `SimpleDatabaseStatus` (parallel to `SimpleApplicationStatus`, exposes `.databaseId`)
  - `SquareCloudAPIError.code` now public — discriminate errors via `err.code === "FAILED_READ"` instead of message matching
  - `assertNumber` literal-assertion helper
  - Runnable code examples under [`examples/`](./examples/)

  ## Bug fixes

  - `database.snapshots.list().download()` was 404-ing because snapshot URL hardcoded `applications/` — now correctly uses `databases/`
  - `Application.deploys.linkGithubApp()` and `Snapshot.download()` now throw `SquareCloudAPIError` (was raw `Error`)
  - `databases.create()` validates `memory` (was previously unchecked)
  - `client.applications.fetch()` now returns a `WebsiteApplication` instance when the response has a domain. `app.isWebsite()` correctly narrows the type and `app.network` is available
  - `client.service.status()` correctly handles the un-enveloped `{ status, message }` payload (was returning `undefined`)

  ## Other

  - Bumped minimum Node to **20.0.0** (Node 18 reached EOL April 2025). tsdown bundles target Node 20.
  - CI now gates publishes on `lint:ci` (non-mutating) and `check-types`. Release step has `NPM_TOKEN` wired up.

### Patch Changes

- 67c39d6: Update official API documentation URL.

## 3.8.0

### Minor Changes

- dd583f8: Rename `backups` to `snapshots`. The old `backups` property will be removed in the next major release.

### Patch Changes

- bd3ea4e: Show response status at unknown API errors

## 3.7.9

### Patch Changes

- afa7761: Update backups routes to snapshots

## 3.7.8

### Patch Changes

- 80ce036: Fix deleting application files.

## 3.7.7

### Patch Changes

- 15d9dc5: Fix CommonJS require not working.

## 3.7.6

### Patch Changes

- 92c7eb6: Remove `zod` dependency.
- cfd06d4: Deprecate `SquareCloudAPI#users` in favor of `SquareCloudAPI#user`. Deprecated property will be removed in the the next major version.
- 775886d: Update backups cache to use `Backup` class instead of API object.
- 3855207: Remove `form-data` dependency.
- 2803f49: Fix cache not being updated.

## 3.7.5

### Patch Changes

- b791055: Remove `requests` prop from `ApplicationStatus`

## 3.7.4

### Patch Changes

- 4df5b0a: Removed `student` and `enterprise-16` from plans.
- 589db60: Removed all API request validations.
- 4df5b0a: Added `advanced` and `enterprise-24` to plans.

## 3.7.0

### Minor Changes

- cbe5512: Remove commit `restart` option. Instead call `application.restart()` manually.

## 3.6.6

### Patch Changes

- fa15164: Improve API error handling to avoid HTML parse error.

## 3.6.5

### Patch Changes

- b560485: Better request JSON parse error debugging.

## 3.6.4

### Patch Changes

- 47ac220: Fix cache defaults not working.

## 3.6.3

### Patch Changes

- 138d9d8: Rename `deploys#current()` to `deploys#webhookURL()`.
- 7a806b0: New structure for backups with download method. It's used at `backups.list()` method.
- 6f302d8: New structure for deployments. It's used at `deploys.list()` method.

## 3.6.2

### Patch Changes

- d59f57f: Now `backups`, `deploys`, `files` and `cache` are available in the BaseApplication.

## 3.6.1

### Patch Changes

- ed4a0b5: Fix CSharp detecting as invalid lang.

## 3.6.0

### Minor Changes

- d7e9b0e: New `Application#deploys#current` method for getting the current deployment URL
- 73c92c2: New `Application#files#edit` method for editing files
- 010e8b9: New `Application#backups#list` method for listing snapshots
- 18cf349: New `Application#network#dns` method for getting DNS records status
- 2da679a: New `Application#files#move` for moving or renaming files
- 4f68026: Implement new API routes convention

### Patch Changes

- a138094: Rename `Application#deploys#getGithubWebhook` to `integrateGithubWebhook`

## 3.5.3

### Patch Changes

- 613579f: Fix `Application#fetch` request loop

## 3.5.1

### Patch Changes

- 6809d52: Fix circular dependency error
- 4dee45a: Attempt to fix circular dependency error

## 3.5.1-next.0

### Patch Changes

- Attempt to fix circular dependency error

## 3.5.0

### Minor Changes

- 6e42e39: Rename all `tag` properties (user and application) to `name` as API deprecated them.
- 6394ebd: Allow some app methods at BaseApplication

### Patch Changes

- 9adbbfe: Rename `ApplicationManager#status` method to `statusAll` to match its API endpoint.

## 3.4.3

### Patch Changes

- 3298bff: Fix `Application#deploys#setGithubWebhook` not returning the webhook URL
- 3298bff: Rename `Application#deploys#setGithubWebhook` to `getGithubWebhook`

## 3.4.2

### Patch Changes

- 066a0a3: update API types ([Check changes](https://github.com/squarecloudofc/api-types/releases/tag/v0.2.3))
- 825da92: improve new assertions debugging

## 3.4.1

### Patch Changes

- b05f12b: Update API types

## 3.4.0

### Minor Changes

- a8320be: Remove `Application#avatar` due to API changes
- 5e84636: Remove `Application#gitIntegration` due to API changes

### Patch Changes

- 08f91ee: Add assertions for `User` structure
- db0ddb0: Add assertions for `Application` and `WebsiteApplication`
- 86765eb: Refactor typing and add assertions for `SimpleApplicationStatus` and `ApplicationStatus`
- 384a563: Using @biomejs/biome as linter instead of eslint
- 7ac1d2e: Using tsup as builder instead of tsc

## 3.3.3

### Patch Changes

- 298743f: Fix error interpretation exception

## 3.3.2

### Patch Changes

- ef6ff49: Edit README to feature new official documentation
- dbca1f8: Fix incorrect file path at `FilesManager#create`

## 3.3.1

### Patch Changes

- a4e4c3f: fix Class extends value undefined
