export { Logo, type LogoProps } from "./assets/Logo";
export { AutoAdvanceIndicator } from "./components/AutoAdvanceIndicator";
export { FlowLine, type FlowLineProps } from "./components/FlowLine";
export {
  EASE_OUT,
  type MotionAllowance,
  stepTransition,
  useMotionAllowance,
} from "./components/motion";
export { ActionButton, NavigationButtons } from "./player/actions";
export type { AutoAdvanceControls } from "./player/autoAdvance";
export type {
  Deck,
  DeckDefinition,
  Slide,
  SlideDefinition,
  SlideProps,
  Tone,
} from "./player/deck";
export { defineDeck, defineSlide } from "./player/deck";
export { useExportMode } from "./player/export-context";
export { SLIDE_AREA_HEIGHT, STAGE_WIDTH, StageScaleContext } from "./player/Stage";
export { useStep } from "./player/step-context";
export type {
  ExportFooterRenderProps,
  FooterBrandProps,
  FooterRenderProps,
  NavigationControls,
  PresentationTemplate,
  TemplateFontRoles,
  TemplatePalette,
  TemplateSurfacePair,
  TemplateTones,
} from "./template/contract";
export { templateStyleVariables, toneStyleVariables } from "./template/style";
