import { MAPLE_LEAF_PATH, MAPLE_LEAF_UPRIGHT } from "./mapleLeaf";

/**
 * Where one leaf sits in the 1920x64 footer band. `transform` places the
 * upright leaf (petiole base at the origin, tip up) by translate, rotate and
 * scale; a negative x scale mirrors it. Large leaves are far taller than the
 * band, so the SVG's own bounds crop them to their most recognizable slice:
 * the central lobe flanked by both side lobes and their V-shaped sinuses.
 * Small leaves fit the band whole, with only the petiole cropped.
 */
interface LeafPlacement {
  readonly transform: string;
}

/**
 * A drift of maple leaves in varied sizes across the footer. Leaves may sit
 * behind the brand and date text: one outline over text keeps at least 5:1
 * contrast on every tone, so no two leaves cross each other there (two
 * crossing outlines drop to 4.3:1 on moss). Leaves stay off the action
 * buttons and never cross each other anywhere.
 */
const LEAVES: ReadonlyArray<LeafPlacement> = [
  // Large, behind the logo, cropped by the footer's left edge.
  { transform: "translate(110 140) rotate(12) scale(0.55)" },
  // Medium, mirrored, behind the copyright line.
  { transform: "translate(365 100) rotate(-10) scale(-0.4 0.4)" },
  // Small, whole, between the brand zone and the very large crown.
  { transform: "translate(500 56) rotate(18) scale(0.18)" },
  // Very large, tilted left, beside the action buttons.
  { transform: "translate(640 175) rotate(-15) scale(0.7)" },
  // Small, whole, between the action buttons and the large mirrored crown.
  { transform: "translate(1190 56) rotate(22) scale(0.17)" },
  // Large, mirrored, tilted right, on the other side of the small whole leaf.
  { transform: "translate(1340 145) rotate(14) scale(-0.58 0.58)" },
  // Medium, before the date zone.
  { transform: "translate(1540 92) rotate(-12) scale(0.36)" },
  // Large, mirrored, behind the date.
  { transform: "translate(1700 118) rotate(16) scale(-0.46 0.46)" },
  // Medium, behind the slide counter, cropped by the footer's right edge.
  { transform: "translate(1910 100) rotate(-14) scale(0.4)" },
];

/** Every leaf takes the maple accent, so the drift reads as one autumn motif. */
const LEAF_ACCENT = "var(--color-theme-accent2)";

/**
 * Footer backdrop art: botanical maple leaves with a very light
 * transparent fill and a fine outline that keeps its pixel width at any scale.
 * Decorative and aria-hidden; the SVG clips everything above the footer, so a
 * template never decorates slide areas.
 */
export function FooterLeaves() {
  return (
    <svg
      data-footer-leaves
      viewBox="0 0 1920 64"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {LEAVES.map((leaf) => (
        <g key={leaf.transform} transform={leaf.transform}>
          <path
            d={MAPLE_LEAF_PATH}
            transform={MAPLE_LEAF_UPRIGHT}
            fill={LEAF_ACCENT}
            fillOpacity={0.08}
            stroke={LEAF_ACCENT}
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}
