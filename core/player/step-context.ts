import { createContext, useContext } from "react";
import type { SlideProps } from "./deck";

export const StepContext = createContext<SlideProps | null>(null);

/** Current build step of the enclosing slide, for components nested inside a slide. */
export function useStep(): SlideProps {
  const value = useContext(StepContext);
  if (!value) throw new Error("useStep() must be used inside a slide");
  return value;
}
