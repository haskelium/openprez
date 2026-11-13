import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  assembleStandaloneHtml,
  validateStandaloneManifest,
} from "../../../scripts/standalone/assemble.mjs";
import { STANDALONE_MANIFEST_FILE } from "../../../scripts/standalone/manifest.ts";

const manifest = {
  version: 1,
  flavor: "user",
  entry: "index.html",
  files: ["assets/app.css", "assets/app.js", "index.html"],
};

function buildFiles({ script, stylesheet } = {}) {
  return new Map([
    [
      "index.html",
      '<!doctype html><link rel="stylesheet" href="/assets/app.css"><script type="module" src="/assets/app.js"></script>',
    ],
    ["assets/app.css", stylesheet ?? "body{color:black}"],
    ["assets/app.js", script ?? "window.ready = true;"],
    [STANDALONE_MANIFEST_FILE, JSON.stringify(manifest)],
  ]);
}

describe("standalone manifest validation", () => {
  it("accepts a matching manifest with an exact file inventory", () => {
    expect(validateStandaloneManifest(manifest, "user", buildFiles().keys())).toEqual(
      manifest.files,
    );
  });

  it.each([
    [{ ...manifest, version: 2 }, /manifest version/],
    [{ ...manifest, flavor: "showcase" }, /identifies showcase/],
    [{ ...manifest, entry: "showcase.html" }, /Expected standalone entry index.html/],
    [{ ...manifest, files: [...manifest.files, "../outside.js"] }, /Unsafe path/],
  ])("rejects malformed or mismatched build metadata", (candidate, message) => {
    expect(() => validateStandaloneManifest(candidate, "user", buildFiles().keys())).toThrow(
      message,
    );
  });

  it("rejects missing and unlisted emitted files", () => {
    const files = buildFiles();
    files.delete("assets/app.css");
    expect(() => validateStandaloneManifest(manifest, "user", files.keys())).toThrow(
      /missing manifest files/,
    );

    const extra = new Map(buildFiles());
    extra.set("extra.js", "window.extra = true;");
    expect(() => validateStandaloneManifest(manifest, "user", extra.keys())).toThrow(
      /not described/,
    );
  });
});

describe("standalone assembly", () => {
  it("keeps String.replace patterns and asset-like prose verbatim in embedded code", async () => {
    const values = ["$$typeof", "$&", "$`", "$'", "$1", "assets/diagram.png"];
    const html = await assembleStandaloneHtml({
      manifest,
      flavor: "user",
      files: buildFiles({ script: `window.values = ${JSON.stringify(values)};` }),
    });

    const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/gi)];
    expect(scripts).toHaveLength(1);
    expect(html.match(/<!doctype/gi)).toHaveLength(1);
    const sandbox = { window: {} };
    runInNewContext(scripts[0][1], sandbox);
    expect(sandbox.window.values).toEqual(values);
    expect(html).not.toMatch(/<script\b[^>]+\bsrc=/i);
    expect(html).not.toMatch(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref=/i);
  });

  it("rejects emitted assets and stylesheet URLs that the build did not inline", async () => {
    const withAsset = buildFiles();
    withAsset.set("assets/image.png", Buffer.from([137, 80, 78, 71]));
    const assetManifest = { ...manifest, files: [...manifest.files, "assets/image.png"] };
    await expect(
      assembleStandaloneHtml({ manifest: assetManifest, flavor: "user", files: withAsset }),
    ).rejects.toThrow(/not inlined: assets\/image\.png/);

    await expect(
      assembleStandaloneHtml({
        manifest,
        flavor: "user",
        files: buildFiles({ stylesheet: 'body{background:url("./image.png")}' }),
      }),
    ).rejects.toThrow(/still references a local file: \.\/image\.png/);
  });

  it("serializes mixed-case whitespace script and style terminators safely", async () => {
    const html = await assembleStandaloneHtml({
      manifest,
      flavor: "user",
      files: buildFiles({
        script: [
          'window.values = { string: "</SCRIPT   >", template: `</sCrIpT\\t>`, regex: /<\\/script/ };',
          "// </script />",
        ].join("\n"),
        stylesheet: 'body::after{content:"</StYlE   >"}/* </style/> */',
      }),
    });

    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/i)?.[1];
    const stylesheet = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
    expect(script).toBeTruthy();
    expect(stylesheet).toBeTruthy();
    expect(script).not.toMatch(/<\/script(?=[\t\n\f\r />])/i);
    expect(stylesheet).not.toMatch(/<\/style(?=[\t\n\f\r />])/i);
    expect(script).toContain("<\\/SCRIPT");
    expect(script).toContain("<\\/sCrIpT");
    const sandbox = { window: {} };
    runInNewContext(script, sandbox);
    expect(sandbox.window.values.string).toBe("</SCRIPT   >");
    expect(sandbox.window.values.template).toBe("</sCrIpT\t>");
    expect(sandbox.window.values.regex.test("</script")).toBe(true);
    expect(stylesheet).toContain("\\3C /StYlE");
    expect(stylesheet).toContain("\\3C /style");
  });

  it("fails with an actionable message for a missing stylesheet or script", async () => {
    const missingScript = buildFiles();
    missingScript.delete("assets/app.js");
    const scriptManifest = {
      ...manifest,
      files: manifest.files.filter((file) => file !== "assets/app.js"),
    };
    missingScript.set(STANDALONE_MANIFEST_FILE, JSON.stringify(scriptManifest));
    await expect(
      assembleStandaloneHtml({ manifest: scriptManifest, flavor: "user", files: missingScript }),
    ).rejects.toThrow(/Could not find emitted script/);

    const missingStylesheet = buildFiles();
    missingStylesheet.delete("assets/app.css");
    const stylesheetManifest = {
      ...manifest,
      files: manifest.files.filter((file) => file !== "assets/app.css"),
    };
    missingStylesheet.set(STANDALONE_MANIFEST_FILE, JSON.stringify(stylesheetManifest));
    await expect(
      assembleStandaloneHtml({
        manifest: stylesheetManifest,
        flavor: "user",
        files: missingStylesheet,
      }),
    ).rejects.toThrow(/Could not find emitted stylesheet/);
  });
});
