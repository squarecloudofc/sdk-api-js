import type { UserConfig } from "tsdown";

export default {
  format: ["cjs", "esm"],
  outDir: "lib",
  target: "node20",
  minify: false,
  sourcemap: false,
  nodeProtocol: "strip",
} satisfies UserConfig;
