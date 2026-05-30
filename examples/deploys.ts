import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);
const app = await api.applications.fetch("abc123def456abc123def456");

// ─── Recent deploys ────────────────────────────────────────────────────────
// Returns Deployment[][] — one timeline per deploy.
// Each timeline walks: pending → clone → commit → restarting → success | error
const history = await app.deploys.list();

for (const timeline of history) {
  const last = timeline.at(-1);
  console.log(`Deploy ${last?.id} ended as ${last?.state}`);

  for (const event of timeline) {
    if (event.state === "clone") console.log(`  cloned branch ${event.branch}`);
    if (event.state === "commit") console.log(`  files`, event.files);
  }
}

// Flatten if you want a single chronological list:
const _flat = history.flat();

// ─── Link a GitHub repository via the Square Cloud GitHub App ──────────────
// Requires a session token (JWT), not a plain API key.
const repo = await app.deploys.linkGithubApp({
  repositoryName: "octocat/hello-world",
  repositoryBranch: "main",
});
console.log(`Linked ${repo.full_name}#${repo.branch}`);

await app.deploys.unlinkGithubApp();

// ─── Or use the legacy webhook flow with a GitHub PAT ──────────────────────
const webhookUrl = await app.deploys.integrateGithubWebhook("ghp_...");
console.log(`Configure GitHub to POST to: ${webhookUrl}`);

// Pass "@" to remove the webhook
await app.deploys.integrateGithubWebhook("@");

// ─── Inspect the current Git deploy config ─────────────────────────────────
const current = await app.deploys.current();
console.log(current.app); // GitHub App linkage, if any
console.log(current.webhook); // legacy webhook URL, if any
