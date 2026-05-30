<div align="center">
  <img alt="Square Cloud Banner" src="https://cdn.squarecloud.app/png/github-readme.png">
</div>

<h1 align="center">@squarecloud/api</h1>

<p align="center">A NodeJS SDK for consuming the <a href="https://squarecloud.app" target="_blank">Square Cloud</a> API.</p>

<div align="center">
  <div style="width: fit-content; display: flex; align-items: flex-start; gap: 4px;">
    <img alt="NPM License" src="https://img.shields.io/npm/l/@squarecloud/api">
    <img alt="NPM Downloads" src="https://img.shields.io/npm/dw/@squarecloud/api">
    <a href="https://npmjs.com/package/@squarecloud/api">
      <img alt="NPM Version" src="https://img.shields.io/npm/v/@squarecloud/api">
    </a>
  </div>
</div>

## Installation

```bash
npm install @squarecloud/api
# or
yarn add @squarecloud/api
# or
pnpm add @squarecloud/api
```

## Documentation

Visit the [official documentation](https://docs.squarecloud.app/en/sdks/js/client) for the full API reference.

## Quick start

```ts
import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY!);

// Fetch your account (user + applications + databases)
const user = await api.user.get();

console.log(`Hi ${user.name}! You have ${user.applications.size} apps.`);

// Grab one application by ID and control it
const app = await api.applications.fetch("abc123def456abc123def456");

await app.start();
await app.envs.set({ DATABASE_URL: "postgres://..." });
const logs = await app.getLogs();
```

## Features

The client exposes the full v2 platform surface:

- **`api.user`** — your account, plan, snapshots
- **`api.applications`** — list, create (upload), fetch
- **`Application`** — status, logs, metrics, start/stop/restart, commit, realtime SSE
  - **`.files`** — read, write, list, move, delete
  - **`.envs`** — environment variables (list/set/replace/delete)
  - **`.snapshots`** — list, create, download, restore
  - **`.deploys`** — list, GitHub App link, webhook, current config
  - **`.network`** *(websites only)* — custom domain, DNS, analytics, errors, logs, performance, purge cache
- **`api.databases`** — create, list, fetch
- **`Database`** — status, metrics, start/stop, update, delete
  - **`.credentials`** — TLS certificate, rotate password/certificate
  - **`.snapshots`** — list, create, download, restore
- **`api.workspaces`** — list, create, fetch
- **`Workspace`** — leave, delete
  - **`.members`** — add, update role, remove
  - **`.applications`** — share, unshare
- **`api.service`** — platform health

## Examples

Runnable snippets per area live in [`examples/`](./examples):

- [`applications.ts`](./examples/applications.ts) — lifecycle, files, envs, commit
- [`snapshots.ts`](./examples/snapshots.ts) — list, create, download, restore
- [`deploys.ts`](./examples/deploys.ts) — list, GitHub App, webhook
- [`network.ts`](./examples/network.ts) — domain, DNS, analytics, errors, purge
- [`databases.ts`](./examples/databases.ts) — create, credentials, snapshots
- [`workspaces.ts`](./examples/workspaces.ts) — invite codes, members, sharing apps
- [`realtime.ts`](./examples/realtime.ts) — SSE event stream

## Contributing

Bug reports and PRs welcome at [`squarecloudofc/sdk-api-js`](https://github.com/squarecloudofc/sdk-api-js).

## Authors

- [@joaotonaco](https://github.com/joaotonaco)
- [@joaootavios](https://github.com/joaootavios)
