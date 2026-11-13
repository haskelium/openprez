import type { PresentationTemplate, TemplateFontRoles } from "@core";
import { ExportFooter, Footer } from "./Footer";

const fonts: TemplateFontRoles = {
  body: '"Trebuchet MS", "Segoe UI", "DejaVu Sans", Arial, sans-serif',
  display: '"Trebuchet MS", "Segoe UI", "DejaVu Sans", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

/** Autumn template: bark surfaces, cream text, maple and pumpkin accents, spruce-teal counterpoint. */
export const autumnTemplate: PresentationTemplate = {
  name: "autumn",
  palette: {
    primary: "#F3E3C7",
    onPrimary: "#2A1A12",
    accent1: "#82503A",
    accent2: "#C4501E",
    accent3: "#E08A2E",
    accent4: "#5A9296",
    accent5: "#FEFAEE",
    neutral: "#B39B80",
    // Data slots: moss and goldenrod as series; indigo is the cool third series.
    data1: "#7C8F3A",
    data2: "#E8B33A",
    data3: "#5C6BB2",
  },
  tones: {
    // The two required names: the bark look and its cream alternative.
    base: { surface: "#2A1A12", onSurface: "#F3E3C7" },
    inverse: { surface: "#F3E3C7", onSurface: "#2A1A12" },
    // A rust section tone and a deep-olive one.
    maple: { surface: "#8C3B1F", onSurface: "#FBF1DF" },
    moss: { surface: "#3E4A22", onSurface: "#F3E3C7" },
  },
  fontSans: fonts.body,
  fonts,
  Footer,
  ExportFooter,
};

export default autumnTemplate;
