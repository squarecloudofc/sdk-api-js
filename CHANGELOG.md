# @squarecloud/api

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
