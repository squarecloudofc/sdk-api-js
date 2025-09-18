import type { Options } from "tsup";

export default {
  target: "es2020",
  format: ["cjs", "esm"],
  outDir: "lib",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
} satisfies Options;
