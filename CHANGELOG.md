# @squarecloud/api

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
