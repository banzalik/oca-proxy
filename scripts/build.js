/**
 * Cross-platform build script for esbuild to avoid Windows shell quoting issues.
 *
 * Usage:
 *   node scripts/build.js
 *
 * Output:
 *   bin/oca-proxy.js (executable on POSIX)
 */

const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const ENTRY = path.join(ROOT, "src", "index.ts");
const OUT_FILE = path.join(ROOT, "bin", "oca-proxy.js");

async function ensureDir(dirPath) {
	await fs.promises.mkdir(dirPath, { recursive: true });
}

async function makeExecutable(filePath) {
	if (process.platform !== "win32") {
		await fs.promises.chmod(filePath, 0o755);
	}
}

async function build() {
	const outDir = path.dirname(OUT_FILE);

	await ensureDir(outDir);

	const opts = {
		entryPoints: [ENTRY],
		bundle: true,
		platform: "node",
		target: "es2022",
		format: "cjs",
		outfile: OUT_FILE,
		banner: {
			js: "#!/usr/bin/env node",
		},
		minify: true,
		legalComments: "none",
		sourcemap: false,
		// Keep the build deterministic across platforms
		logLevel: "info",
	};

	try {
		const result = await esbuild.build(opts);
		// esbuild v0.27+ returns undefined by default unless write:false, still ok
		await makeExecutable(OUT_FILE);

		// Print summary
		console.log(`Built: ${path.relative(ROOT, OUT_FILE)}`);
		if (result?.metafile) {
			const outputs = Object.keys(result.metafile.outputs || {});
			console.log(`Outputs: ${outputs.length}`);
		}
	} catch (err) {
		console.error("esbuild failed:");
		if (err?.errors) {
			for (const e of err.errors) {
				console.error("-", e.text || e);
			}
		} else {
			console.error(err);
		}
		process.exit(1);
	}
}

process.on("unhandledRejection", (err) => {
	console.error("Unhandled rejection:", err);
	process.exit(1);
});

build();
