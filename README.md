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
// or
yarn add @squarecloud/api
// or
pnpm add @squarecloud/api
```

## Documentation

Visit our [official documentation](https://docs.squarecloud.app/sdks/js/) for more information about how to use this library.

## Getting Started

```ts
import { SquareCloudAPI } from "@squarecloud/api"
// const { SquareCloudAPI } = require("@squarecloud/api");

const api = new SquareCloudAPI("Your API Key")
const user = await api.users.get()
const application = user.applications.get("Application ID")
```

## Contributing

Feel free to contribute with suggestions or bug reports at our [GitHub repository](https://github.com/squarecloudofc/sdk-api-js).

## Authors

- [@joaotonaco](https://github.com/joaotonaco)
- [@joaootavios](https://github.com/joaootavios)