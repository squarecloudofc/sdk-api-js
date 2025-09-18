import type { Options } from "tsup";

export default {
  target: "es2020",
  format: ["cjs", "esm"],
  outDir: "lib",
  dts: true,
  minify: false,
  clean: true,
  sourcemap: false,
  splitting: false,
} satisfies Options;
