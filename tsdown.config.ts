import type { UserConfig } from "tsdown";

export default {
  target: "es2020",
  format: ["cjs", "esm"],
  outDir: "lib",
  dts: true,
  minify: false,
  clean: true,
  sourcemap: false,
} satisfies UserConfig;
