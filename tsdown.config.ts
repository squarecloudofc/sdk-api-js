import type { UserConfig } from "tsdown";

export default {
  format: ["cjs", "esm"],
  outDir: "lib",
  minify: false,
  sourcemap: false,
  nodeProtocol: "strip",
} satisfies UserConfig;
