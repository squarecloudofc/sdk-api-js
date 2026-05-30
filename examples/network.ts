import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);
const app = await api.applications.fetch("abc123def456abc123def456");

// `.network` is only available on website applications
if (!app.isWebsite()) {
  throw new Error("This application is not a website");
}

// ─── Custom domain ─────────────────────────────────────────────────────────
// Available on Standard, Pro, and Enterprise plans.
await app.network.setCustomDomain("yoursite.com");

// Pass "@" to remove the existing custom domain
await app.network.setCustomDomain("@");

// ─── DNS records ───────────────────────────────────────────────────────────
// After attaching a custom domain, configure these at your registrar.
const dns = await app.network.dns();
console.log(
  `${dns.ownership.type} ${dns.ownership.name} → ${dns.ownership.value}`,
);
console.log(`SSL: ${dns.ssl.status}`); // pending | pending_validation | active

// ─── Analytics (last 7 days max) ───────────────────────────────────────────
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
const analytics = await app.network.analytics({
  start: since,
  end: new Date(),
});

// Guard against empty windows (before the app was created)
if ("visits" in analytics) {
  console.log(analytics.visits.length, "time buckets");
  console.log("Top countries:", analytics.countries.slice(0, 5));
  console.log("Top paths:", analytics.paths.slice(0, 5));
}

// ─── Errors (5xx by default; pass include4xx for both) ─────────────────────
const errors = await app.network.errors({
  start: since,
  end: new Date(),
  include4xx: true,
});

if ("summary" in errors) {
  console.log(`Total: ${errors.summary.total}`);
  console.log(`By class:`, errors.summary.by_class);
  console.log(`Top failing paths:`, errors.top_paths.slice(0, 3));
}

// ─── Per-request logs (Pro+) ───────────────────────────────────────────────
const logs = await app.network.logs({ start: since, end: new Date() });

for (const log of logs.slice(0, 5)) {
  console.log(
    log.timestamp,
    log.request.method,
    log.request.path,
    "→",
    log.response.status,
    `(${log.client.country ?? "??"})`,
  );
}

// ─── Latency percentiles (Pro+) ────────────────────────────────────────────
const perf = await app.network.performance({ start: since, end: new Date() });

if ("summary" in perf) {
  console.log(
    `Edge p50/p95/p99: ${perf.summary.edge.p50}/${perf.summary.edge.p95}/${perf.summary.edge.p99}ms`,
  );
  console.log("Slowest paths:", perf.slowest_paths.slice(0, 3));
}

// ─── Purge edge cache ──────────────────────────────────────────────────────
await app.network.purgeCache();
