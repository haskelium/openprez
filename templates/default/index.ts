import type { PresentationTemplate, TemplateFontRoles } from "@core";
import "./fonts.css";
import { ExportFooter, Footer } from "./Footer";

const fonts: TemplateFontRoles = {
  body: '"Atkinson Hyperlegible Next", Arial, Helvetica, sans-serif',
  display: '"Atkinson Hyperlegible Next", Arial, Helvetica, sans-serif',
  mono: '"Atkinson Hyperlegible Mono", ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace',
};

/** Espresso template: warm brown surfaces, beige text, caramel lead, orange labels, teal and red accents. */
export const defaultTemplate: PresentationTemplate = {
  name: "default",
  palette: {
    primary: "#EBDDC9",
    onPrimary: "#1D1612",
    accent1: "#43362C",
    accent2: "#E0A86E",
    accent3: "#FF8A3D",
    accent4: "#2EC4B0",
    accent5: "#FBF5EC",
    neutral: "#A8978A",
    // A data slot: red pairs with gold and teal as three chart series that stay distinct for colour-blind viewers.
    data1: "#EF4B3C",
    data2: "#FFC93C",
    data3: "#5A5FA8",
  },
  tones: {
    // The two required names: the espresso look and its lighter taupe alternative.
    base: { surface: "#1D1612", onSurface: "#EBDDC9" },
    inverse: { surface: "#4B3E34", onSurface: "#F3E9DA" },
    // A deep-teal section tone.
    teal: { surface: "#1F4E4A", onSurface: "#F3E9DA" },
  },
  fontSans: fonts.body,
  fonts,
  Footer,
  ExportFooter,
};

export default defaultTemplate;
