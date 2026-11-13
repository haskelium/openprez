import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./browser.mjs";

const slideIds = [
  ...readFileSync(join(ROOT, "showcase/deck.tsx"), "utf8").matchAll(
    /defineSlide\(\{\s*id:\s*"([^"]+)"/g,
  ),
].map((match) => match[1]);

/** The 1-based showcase position of a slide id, so scenarios survive deck reordering. */
export function showcaseSlide(id) {
  const index = slideIds.indexOf(id);
  if (index === -1) throw new Error(`Showcase slide "${id}" not found in showcase/deck.tsx`);
  return index + 1;
}

/** The URL hash for a showcase slide and step. */
export function showcaseHash(id, step = 1) {
  return `#/${showcaseSlide(id)}/${step}`;
}
