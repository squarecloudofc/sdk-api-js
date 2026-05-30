import { setTimeout } from "node:timers/promises";

import type { Application } from "../lib/src.mjs";

/**
 * Polls the application's status until it's running on the cluster, or until
 * the timeout elapses. Tests that hit cluster-bound endpoints (envs, files,
 * logs, metrics) need this — the upload returns instantly but the cluster
 * provisions in the background, and hitting it too early yields 404s.
 *
 * After `status.running` flips to `true`, an extra `settleMs` delay is added
 * so cluster-side storage layers (envs, etc.) have time to finish initializing.
 */
export async function waitForRunning(
  app: Application,
  { timeoutMs = 60_000, intervalMs = 2_000, settleMs = 5_000 } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const status = await app.getStatus();
      if (status.running) {
        await setTimeout(settleMs);
        return;
      }
    } catch {
      // status endpoint may also 404 while provisioning — ignore and retry
    }
    await setTimeout(intervalMs);
  }

  throw new Error(`Application ${app.id} did not start within ${timeoutMs}ms`);
}
