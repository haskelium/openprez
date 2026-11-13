import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { standaloneBuildOptions, standaloneManifestPlugin } from "./manifest.ts";

const FIXTURE_HTML = `<!doctype html>
<html>
  <head><meta charset="UTF-8"><title>Standalone fixture</title></head>
  <body><div id="root"></div><script type="module" src="./main.js"></script></body>
</html>`;
const FIXTURE_STYLE = `#fixture-surface { width: 48px; height: 48px; background-image: url("./fixture.svg"); }
#fixture-surface::after { content: "</StYlE   >"; }`;
const FIXTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#5af"/></svg>`;
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function fixtureScript(flavor) {
  return `import imageUrl from "./fixture.svg";
import "./style.css";

window.__standaloneFixture = {
  flavor: ${JSON.stringify(flavor)},
  proseAsset: "assets/diagram.png",
  codeExample: "import('demo')",
  scriptEnd: "</SCRIPT   >",
  templateEnd: \`</sCrIpT\\t>\`,
  // String.replace patterns that must survive assembly verbatim.
  replacementPatterns: ["$$typeof", "$&", "$\`", "$'", "$1"].join("|"),
  imageUrl,
};

const root = document.querySelector("#root");
root.innerHTML = '<main><div id="fixture-surface"></div><img id="fixture-image"></main>';
document.querySelector("#fixture-image").src = imageUrl;
window.loadFixtureChunk = () => import("./lazy.js").then(({ answer }) => answer);
// </script />
`;
}

function fixtureLazyScript() {
  return 'export const answer = "dynamic-import-bundled";';
}

async function buildFlavor(sourceDirectory, outputDirectory, flavor) {
  const entry = flavor === "showcase" ? "showcase.html" : "index.html";
  await writeFile(join(sourceDirectory, entry), FIXTURE_HTML, "utf8");
  await writeFile(join(sourceDirectory, "main.js"), fixtureScript(flavor), "utf8");
  await writeFile(join(sourceDirectory, "lazy.js"), fixtureLazyScript(), "utf8");
  await writeFile(join(sourceDirectory, "style.css"), FIXTURE_STYLE, "utf8");
  await writeFile(join(sourceDirectory, "fixture.svg"), FIXTURE_SVG, "utf8");

  await build({
    configFile: false,
    root: sourceDirectory,
    mode: flavor === "showcase" ? "showcase-standalone" : "standalone",
    plugins: [standaloneManifestPlugin(flavor)],
    build: {
      emptyOutDir: true,
      ...standaloneBuildOptions({ input: join(sourceDirectory, entry), outDir: outputDirectory }),
    },
  });

  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(ROOT, "scripts/standalone/cli.mjs"), ...(flavor === "showcase" ? ["showcase"] : [])],
      {
        cwd: ROOT,
        env: { ...process.env, OPENPREZ_BUILD_DIR: outputDirectory },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (data) => (stdout += data));
    child.stderr.setEncoding("utf8").on("data", (data) => (stderr += data));
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve(stdout)
        : reject(new Error(stderr || `Standalone assembly failed (${code})`)),
    );
  });

  if (!result.includes("Standalone presentation written")) {
    throw new Error(`Standalone ${flavor} assembly did not report success`);
  }
  const outputFiles = await readdir(outputDirectory);
  if (outputFiles.length !== 1 || outputFiles[0] !== "prez.html") {
    throw new Error(
      `Standalone ${flavor} output was not cleaned to prez.html: ${outputFiles.join(", ")}`,
    );
  }
  const output = join(outputDirectory, "prez.html");
  const html = await readFile(output, "utf8");
  if (html.length < 1000) throw new Error(`Standalone ${flavor} artifact is unexpectedly small`);
  return output;
}

export async function createStandaloneFixtures() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "openprez-standalone-fixtures-"));
  const sourceDirectory = join(temporaryDirectory, "source");
  const userOutputDirectory = join(temporaryDirectory, "user");
  const showcaseOutputDirectory = join(temporaryDirectory, "showcase");
  await Promise.all([
    mkdir(sourceDirectory, { recursive: true }),
    mkdir(userOutputDirectory, { recursive: true }),
    mkdir(showcaseOutputDirectory, { recursive: true }),
  ]);
  try {
    const userFile = await buildFlavor(sourceDirectory, userOutputDirectory, "user");
    const showcaseFile = await buildFlavor(sourceDirectory, showcaseOutputDirectory, "showcase");
    return {
      userFile,
      showcaseFile,
      cleanup: () => rm(temporaryDirectory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}
