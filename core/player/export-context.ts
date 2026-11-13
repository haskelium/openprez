import { createContext, useContext } from "react";

export const ExportModeContext = createContext(false);

/** Whether the enclosing slide is being rendered as a static PDF page. */
export function useExportMode(): boolean {
  return useContext(ExportModeContext);
}
