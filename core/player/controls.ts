import type { AutoAdvanceControls } from "./autoAdvance";
import type { availableActions, NavigationAction } from "./navigation";

/** What the footer needs from the player: position, which actions apply, and how to trigger one. */
export interface NavigationControls {
  slide: number;
  total: number;
  can: ReturnType<typeof availableActions>;
  dispatch: (action: NavigationAction) => void;
  onExportPdf: () => void;
  exporting: boolean;
  exportError: string | null;
  /** Whether the presenter (speaker notes) window is open. */
  notesOpen: boolean;
  /** Open the presenter window, or close it when open. */
  onToggleNotes: () => void;
  /** Shown when the presenter window could not be opened, for example because of a pop-up blocker. */
  notesError: string | null;
  /** Countdown for the current step's auto-advance; absent for compatibility with older controls. */
  autoAdvance?: AutoAdvanceControls | null;
}
