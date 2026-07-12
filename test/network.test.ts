import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  type Application,
  SquareCloudAPI,
  SquareCloudAPIError,
  type WebsiteApplication,
} from "../lib/src.mjs";

const skip = !process.env.SQUARE_API_KEY
  ? "SQUARE_API_KEY is not set"
  : undefined;

describe("NetworkModule", { skip }, async () => {
  const client = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

  let website: WebsiteApplication | undefined;

  before(async () => {
    const apps = await client.applications.get();
    const first = apps.first() as Application | undefined;

    if (!first) return;

    const fetched = await first.fetch();
    if (fetched.isWebsite()) website = fetched;
  });

  await it("dns() should return an array of DNS records", async (t) => {
    if (!website) return t.skip("no website application available");

    try {
      const dns = await website.network.dns();

      assert.ok(Array.isArray(dns), "dns response should be an array");
      assert.ok(dns.length > 0, "dns response should have at least one record");
      for (const record of dns) {
        assert.ok(["txt", "cname"].includes(record.type));
        assert.strictEqual(typeof record.name, "string");
        assert.strictEqual(typeof record.value, "string");
        assert.strictEqual(typeof record.status, "string");
      }
    } catch (err) {
      if (
        err instanceof SquareCloudAPIError &&
        err.code === "NO_CUSTOM_DOMAIN"
      ) {
        t.skip("no custom domain attached");
      } else {
        throw err;
      }
    }
  });

  await it("analytics() should accept { start, end } as Date or string", async (t) => {
    if (!website) return t.skip("no website application available");

    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);

    const analytics = await website.network.analytics({ start, end });

    assert.ok(analytics);
    assert.strictEqual(typeof analytics, "object");

    // Empty {} is valid for windows that precede app creation
    if ("visits" in analytics) {
      assert.ok(Array.isArray(analytics.visits));
      assert.ok(Array.isArray(analytics.countries));
      assert.ok(Array.isArray(analytics.paths));
    }
  });

  await it("errors() should accept a valid range and return the expected shape", async (t) => {
    if (!website) return t.skip("no website application available");

    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);

    const errors = await website.network.errors({ start, end });

    assert.ok(errors);
    assert.strictEqual(typeof errors, "object");

    // Empty {} is valid when no errors in the window or before app creation
    if ("summary" in errors) {
      assert.ok(typeof errors.summary.total === "number");
      assert.ok(Array.isArray(errors.by_status));
      assert.ok(Array.isArray(errors.timeseries));
      assert.ok(Array.isArray(errors.top_paths));
      assert.ok(Array.isArray(errors.by_method));
    }
  });
});
