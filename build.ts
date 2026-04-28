import * as esbuild from "npm:esbuild@^0.25.0";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.1";
import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";
import * as cli from "jsr:@std/cli";

import svgToPng from "jsr:@pumpn/svg-to-png";
import webExt from "npm:web-ext";
import ChromeExtension from "npm:crx@^5.0.1";

const knownTargets = new Set(["firefox", "chrome", "dev"]);
const args = cli.parseArgs(Deno.args, { default: { target: "dev" } });
if (args.target != undefined && !knownTargets.has(args.target)) {
  console.error(`Unknown target: ${args.target}. Known targets:`);
  for (const t of knownTargets) {
    console.log(`\t- ${t}`);
  }
  exit();
}

await fs.emptyDir("./dist");

const toCopy = ["./src/popup.html", "./src/popup.css"];

if (args.target !== "chrome") {
  toCopy.push("./src/manifest.json", "./src/icon.svg");
} else {
  // I shouldn't have to do this in the first place,
  // so sue me for using an entire headless browser to render an SVG.
  await svgToPng(
    await Deno.realPath("./src/icon.svg"),
    path.resolve(await Deno.realPath("./dist/"), "./icon.png"),
    // The actual resolution of the output image depends on DPI scaling.
    // Whatever. Whatever. Whatever.
    { resizeHeight: 128 },
  );

  // I shouldn't have to do this in the first place,
  // so sue me for doing string replacement instead of deserializing.
  let manifest = await Deno.readTextFile("./src/manifest.json");
  manifest = manifest.replaceAll('"icon.svg"', '"icon.png"');
  await Deno.writeTextFile("./dist/manifest.json", manifest);
}

for (const srcPath of toCopy) {
  const dstPath = path.resolve("./dist/", path.relative("./src/", srcPath));
  await fs.ensureDir(path.dirname(dstPath));
  await fs.copy(srcPath, dstPath);
}

const entryPoints = ["./src/popup-ui.js"];

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints,
  outdir: "./dist/",
  bundle: true,
  format: "esm",
  minify: args.target !== "dev",
});

esbuild.stop();

if (args.target !== "dev") {
  await fs.ensureDir("./pack");
}

if (args.target === "firefox") {
  await webExt.cmd.build({
    sourceDir: "./dist",
    artifactsDir: "./pack",
    filename: "spa-overrides.xpi",
    overwirteDest: true,
  });
} else if (args.target === "chrome") {
  const privateKey = await Deno.readFile("./key.pem");
  const crx = new ChromeExtension({ privateKey });
  await crx.load("./dist");
  const buffer = await crx.pack();
  await Deno.writeFile("./pack/spa-overrides.crx", buffer);
}
