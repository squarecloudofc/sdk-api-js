import { defineConfig } from "tsdown";

// The doc comments ship in lib/*.d.ts, where editors read them. Keep them out
// of the runtime bundle.
export default defineConfig({
	outputOptions: { comments: { jsdoc: false } },
});
