import type { ComponentType } from "react";
import type { NavigationControls } from "../player/controls";

export type { NavigationControls };

/** The surface pair a named tone renders: chrome and slide background with its text. */
export interface TemplateSurfacePair {
  /** Slide and footer background color for slides using this tone. */
  surface: string;
  /** Default text color on that surface. */
  onSurface: string;
}

/**
 * Named tones a template declares. A slide picks one by name; the player resolves
 * its surface pair, so the footer and slide background always come from the template.
 * "base" is the deck's normal look and "inverse" its contrast pair; templates may
 * declare more names.
 */
export interface TemplateTones {
  base: TemplateSurfacePair;
  inverse: TemplateSurfacePair;
  [name: string]: TemplateSurfacePair;
}

/**
 * Palette values a template must provide. The token names are the foundation's stable vocabulary;
 * the template picks each value freely for the atmosphere it wants, so no ordering, scale or
 * relationship among the secondary tokens is implied.
 */
export interface TemplatePalette {
  /** Primary colors; brand marks use only these. */
  primary: string;
  /** The color that sits on the primary. */
  onPrimary: string;
  /** Secondary accents for depth, diagrams, panels and highlights; free-choice, unordered values. */
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  /** Neutral color for secondary text. */
  neutral: string;
  /** Data and emphasis colors. */
  data1: string;
  data2: string;
  data3: string;
}

/** Sizing supplied by a template to its footer mark. */
export interface FooterBrandProps {
  className?: string;
}

/** Inputs the player gives a template's live footer on every slide. */
export interface FooterRenderProps {
  /** Configured footer mark; templates fall back to Logo when omitted. */
  Brand?: ComponentType<FooterBrandProps>;
  controls: NavigationControls;
  /** Presentation date, fixed for the whole session. */
  date: Date;
  /** Configured copyright notice; templates may use their own default when omitted. */
  copyrightNotice?: string;
}

/** Inputs the player gives a template's footer on every exported PDF page. */
export interface ExportFooterRenderProps {
  /** The same footer mark used by the live footer. */
  Brand?: ComponentType<FooterBrandProps>;
  date: Date;
  page: number;
  total: number;
  /** Configured copyright notice; templates may use their own default when omitted. */
  copyrightNotice?: string;
}

/** Font-family stacks selected by a template for semantic typography roles. */
export interface TemplateFontRoles {
  body: string;
  display: string;
  mono: string;
}

/**
 * The visual identity wrapped around a deck's slides: palette for all visuals, typography,
 * and footer presentation for live slides and exported PDF pages. Navigation behavior stays
 * in the player; the template arranges it.
 */
export interface PresentationTemplate {
  name: string;
  palette: TemplatePalette;
  /** Surface pairs slides select from via their tone name. */
  tones: TemplateTones;
  /** Legacy body font stack, retained for templates and consumers using the original contract. */
  fontSans: string;
  /**
   * Optional template-selected typography roles. When omitted, fontSans supplies body and
   * system defaults supply display and mono.
   */
  fonts?: TemplateFontRoles;
  /** Optional footer-only brand mark, shared by live and PDF footers. Defaults to Logo. */
  FooterBrand?: ComponentType<FooterBrandProps>;
  Footer: ComponentType<FooterRenderProps>;
  ExportFooter: ComponentType<ExportFooterRenderProps>;
}
