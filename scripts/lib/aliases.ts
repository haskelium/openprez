import { join } from "node:path";

/**
 * Project import aliases, shared by the Vite config and the boundary checker so the two can
 * never drift apart. `rootDir` is the repository root as an absolute filesystem path.
 */
export interface ProjectAlias {
  find: RegExp;
  replacement: string;
}

export function projectAliases(rootDir: string): ProjectAlias[] {
  return [
    { find: /^@core$/, replacement: join(rootDir, "core/index.ts") },
    { find: /^@presentation\/deck$/, replacement: join(rootDir, "presentation/deck") },
    { find: /^@showcase\/deck$/, replacement: join(rootDir, "showcase/deck") },
    // Any template folder is selectable by name: @template/<name> -> templates/<name>/index.ts.
    {
      find: /^@template\/([a-z0-9][a-z0-9-]*)$/,
      replacement: join(rootDir, "templates/$1/index.ts"),
    },
  ];
}

/** Namespaces whose import strings belong to this project rather than to a package. */
export const PROJECT_NAMESPACES: readonly string[] = [
  "core",
  "presentation",
  "showcase",
  "template",
];
