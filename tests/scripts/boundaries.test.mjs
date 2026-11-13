import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkEdge,
  collectImports,
  resolveSpecifier,
  scanProject,
} from "../../scripts/boundaries.mjs";
import { projectAliases } from "../../scripts/lib/aliases.ts";

/**
 * Fixtures are throwaway projects in the system temp directory: intentionally invalid imports
 * never live in this repository's source tree, and nothing is left behind after the run.
 */

let root;

async function write(relativePath, content) {
  const path = join(root, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
  return path;
}

/** A minimal governed project with the same areas and aliases as the real one. */
async function seedProject() {
  await write("core/index.ts", "export const core = 1;\n");
  await write("core/deep.ts", "export const deep = 2;\n");
  await write("core/assets/logo.svg", "<svg />");
  await write("presentation/deck.tsx", "export default {};\n");
  await write("presentation/slides/index.ts", "export const slide = 1;\n");
  await write("presentation/slides/Title.tsx", "export const Title = 1;\n");
  await write("presentation/assets/photo.png", "\u{FFFD}");
  await write("showcase/deck.tsx", "export default {};\n");
  await write("showcase/slides/S.tsx", "export const S = 1;\n");
  await write("templates/alpha/index.ts", "export const alpha = 1;\n");
  await write("templates/alpha/footer.ts", "export const footer = 1;\n");
  await write("templates/beta/index.ts", "export const beta = 1;\n");
  await write("tests/support/shared.ts", "export const shared = 1;\n");
  await write(
    "app/main.tsx",
    'import deck from "@presentation/deck";\nimport { core } from "@core";\nexport { deck, core };\n',
  );
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "openprez-boundaries-"));
  await seedProject();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("collectImports", () => {
  it("collects static, type-only, re-export and literal dynamic imports", () => {
    const source = [
      'import { a } from "./a";',
      'import type { B } from "./b";',
      'import "./side.css";',
      'export { c } from "./c";',
      'export * from "./d";',
      'export type { E } from "./e";',
      'const m = import("./lazy");',
      "const computed = import(someName);",
      'import img from "./pic.svg";',
    ].join("\n");
    const found = collectImports(source, "tsx");
    expect(found).toEqual(["./a", "./b", "./side.css", "./c", "./d", "./e", "./lazy", "./pic.svg"]);
  });
});

describe("resolveSpecifier", () => {
  it("expands alias capture groups to real destinations", async () => {
    const template = await resolveSpecifier(
      "@template/alpha",
      join(root, "presentation/deck.tsx"),
      projectAliases(root),
      root,
    );
    expect(template).toBe(join(root, "templates/alpha/index.ts"));
  });

  it("resolves extension-less and directory-index imports", async () => {
    const direct = await resolveSpecifier(
      "./Title",
      join(root, "presentation/slides/S.tsx"),
      projectAliases(root),
      root,
    );
    expect(direct).toBe(join(root, "presentation/slides/Title.tsx"));

    const index = await resolveSpecifier(
      "./slides",
      join(root, "presentation/deck.tsx"),
      projectAliases(root),
      root,
    );
    expect(index).toBe(join(root, "presentation/slides/index.ts"));
  });

  it("returns null for external packages without touching the filesystem", async () => {
    expect(
      await resolveSpecifier(
        "motion/react",
        join(root, "presentation/deck.tsx"),
        projectAliases(root),
        root,
      ),
    ).toBeNull();
  });

  it("rejects project-namespace specifiers no alias resolves", async () => {
    await expect(
      resolveSpecifier(
        "@core/player/deck",
        join(root, "presentation/deck.tsx"),
        projectAliases(root),
        root,
      ),
    ).rejects.toThrow(/does not match any configured alias/);
  });

  it("rejects imports that resolve to no existing local file", async () => {
    await expect(
      resolveSpecifier(
        "./missing",
        join(root, "presentation/deck.tsx"),
        projectAliases(root),
        root,
      ),
    ).rejects.toThrow(/does not resolve to an existing local file/);
  });
});

describe("scanProject ownership matrix", () => {
  it("accepts permitted edges: public @core, own-area files, assets and external packages", async () => {
    await write(
      "presentation/deck.tsx",
      [
        'import { core } from "@core";',
        'import { Title } from "./slides/Title";',
        'import photo from "./assets/photo.png";',
        'import { motion } from "motion/react";',
        "export default { core, Title, photo, motion };",
      ].join("\n"),
    );
    await write(
      "templates/alpha/index.ts",
      [
        'import { core } from "@core";',
        'import { footer } from "./footer";',
        'import { motion } from "motion/react";',
        "export const alpha = { core, footer, motion };",
      ].join("\n"),
    );
    await write(
      "core/player/Stage.tsx",
      'import { deep } from "../deep";\nexport const Stage = deep;\n',
    );
    expect(await scanProject(root, { aliases: projectAliases(root) })).toEqual([]);
  });

  it("accepts test importers of the shared test-support area, but not runtime importers", async () => {
    await write(
      "templates/alpha/contrast.test.ts",
      'import { shared } from "../../tests/support/shared";\nimport { alpha } from "./index";\nexport const x = shared + alpha;\n',
    );
    expect(await scanProject(root, { aliases: projectAliases(root) })).toEqual([]);

    await write(
      "templates/alpha/leak.ts",
      'import { shared } from "../../tests/support/shared";\nexport const leak = shared;\n',
    );
    const runtime = await scanProject(root, { aliases: projectAliases(root) });
    expect(runtime).toHaveLength(1);
    expect(runtime[0]).toMatch(/Template code must not import test support at runtime/);
  });

  it("rejects relative imports of core internals from a template", async () => {
    await write(
      "templates/alpha/index.ts",
      'import { deep } from "../../core/deep";\nexport const alpha = deep;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/core internal "core\/deep(.\w+)?"/);
  });

  it("rejects type-only and re-export boundary bypasses", async () => {
    await write(
      "templates/alpha/typeOnly.ts",
      'import type { Deep } from "../../core/deep";\nexport type X = Deep;\n',
    );
    await write("templates/alpha/reexport.ts", 'export { deep } from "../../core/deep";\n');
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(2);
    for (const violation of violations) {
      expect(violation).toMatch(/core internal "core\/deep(.\w+)?"/);
    }
  });

  it("rejects literal dynamic imports across boundaries", async () => {
    await write(
      "templates/alpha/index.ts",
      'const deep = await import("../../core/deep");\nexport const alpha = deep;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/core internal "core\/deep(.\w+)?"/);
  });

  it("rejects cross-template imports, including unselected templates", async () => {
    await write(
      "templates/alpha/index.ts",
      'import { beta } from "../beta/index";\nexport const alpha = beta;\n',
    );
    await write(
      "templates/beta/index.ts",
      'import { alpha } from "../alpha/index";\nexport const beta = alpha;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(2);
    for (const violation of violations) {
      expect(violation).toMatch(/must not import another template/);
    }
  });

  it("rejects cross-deck imports and deck imports of templates", async () => {
    await write(
      "presentation/deck.tsx",
      'import { S } from "../showcase/slides/S";\nexport default { S };\n',
    );
    await write(
      "showcase/slides/S.tsx",
      'import { alpha } from "@template/alpha";\nexport const S = alpha;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(2);
    expect(violations.some((v) => v.match(/only import files inside its own deck folder/))).toBe(
      true,
    );
    expect(violations.some((v) => v.match(/Deck code must not import templates/))).toBe(true);
  });

  it("rejects imported assets that cross an ownership boundary", async () => {
    await write(
      "templates/alpha/index.ts",
      'import photo from "../../presentation/assets/photo.png";\nexport const alpha = photo;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/must not import deck content/);
  });

  it("requires the literal @core alias even when a symlink reaches the public entry", async () => {
    await symlink(join(root, "core/index.ts"), join(root, "templates/alpha/public-core-link.ts"));
    await write(
      "templates/alpha/index.ts",
      'import { core } from "./public-core-link";\nexport const alpha = core;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/public "@core" entry only/);
  });

  it("treats a symlink destination by its real owner and rejects the escape", async () => {
    await symlink(join(root, "core/deep.ts"), join(root, "templates/alpha/linked.ts"));
    await write(
      "templates/alpha/index.ts",
      'import { deep } from "./linked";\nexport const alpha = deep;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/core internal "core\/deep(.\w+)?"/);
  });

  it("rejects foundation imports of deck or template code whatever the spelling", async () => {
    await write(
      "core/player/Player.tsx",
      'import { alpha } from "@template/alpha";\nimport deck from "@presentation/deck";\nexport const Player = { alpha, deck };\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(2);
    expect(
      violations.some((v) => v.match(/Foundation code must not import (deck content|templates)/)),
    ).toBe(true);
  });

  it("rejects type-position import() references to core internals", async () => {
    await write(
      "templates/alpha/index.ts",
      'export type Deep = import("../../core/deep").Deep;\nexport const alpha = 1;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/core internal "core\/deep(.\w+)?"/);
  });

  it("rejects runtime imports of repository files outside every governed area", async () => {
    await write("scripts/lib/helper.mjs", "export const helper = 1;\n");
    await write(
      "templates/alpha/index.ts",
      'import { helper } from "../../scripts/lib/helper.mjs";\nexport const alpha = helper;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/must not import files outside its own area/);
  });

  it("rejects foundation imports of a composition entry", async () => {
    await write("app/main.tsx", "export const main = 1;\n");
    await write(
      "core/player/Player.tsx",
      'import { main } from "../../app/main";\nexport const Player = main;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/must not import a composition entry/);
  });

  it("rejects template imports of the shared app bootstrap", async () => {
    await write("app/bootstrap.tsx", "export const bootstrapApp = 1;\n");
    await write(
      "templates/alpha/index.ts",
      'import { bootstrapApp } from "../../app/bootstrap";\nexport const alpha = bootstrapApp;\n',
    );
    const violations = await scanProject(root, { aliases: projectAliases(root) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/must not import a composition entry/);
  });

  it("leaves no fixture files behind and never writes inside the scanned root", async () => {
    await write(
      "templates/alpha/index.ts",
      'import { core } from "@core";\nexport const alpha = core;\n',
    );
    expect(await scanProject(root, { aliases: projectAliases(root) })).toEqual([]);
  });
});

describe("checkEdge", () => {
  it("lets the composition entry wire decks, templates and the player together", () => {
    const composition = { kind: "composition", name: "composition", root: join(root, "app") };
    expect(
      checkEdge(
        join(root, "app/main.tsx"),
        composition,
        join(root, "presentation/deck.tsx"),
        { kind: "deck", name: "presentation", root: join(root, "presentation") },
        root,
      ),
    ).toBeNull();
  });
});
