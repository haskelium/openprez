import { AutoAdvanceIndicator } from "../components/AutoAdvanceIndicator";
import { NavigationButtons } from "../player/actions";
import type { AutoAdvanceControls } from "../player/autoAdvance";
import type { NavigationControls } from "../player/controls";
import type { Deck } from "../player/deck";
import type { NavigationAction, Position } from "../player/navigation";
import type { PresentationTemplate } from "../template/contract";
import type { TimerCommand } from "../time";
import { PresenterNotes } from "./PresenterNotes";
import { PresenterPreviews } from "./PresenterPreviews";
import { PresenterTimerControls } from "./PresenterTimerControls";
import { formatClock } from "./timeFormat";

export interface PresenterLayoutProps {
  deck: Deck;
  position: Position;
  /** Elapsed main-session time, or null before the first synchronized snapshot. */
  elapsed: number | null;
  paused: boolean;
  now: Date;
  connected: boolean;
  connectionMessage: string | null;
  can: NavigationControls["can"];
  dispatch: (action: NavigationAction) => void;
  onTimerCommand: (command: TimerCommand) => void;
  autoAdvance?: AutoAdvanceControls | null;
  template?: PresentationTemplate;
}

/** Composes the presenter header, slide previews, notes pane and player navigation. */
export function PresenterLayout({
  deck,
  position,
  elapsed,
  paused,
  now,
  connected,
  connectionMessage,
  can,
  dispatch,
  onTimerCommand,
  autoAdvance,
  template,
}: PresenterLayoutProps) {
  const slide = deck.slides[position.slide - 1];

  return (
    <div
      data-presenter-view
      className="presenter-view flex h-full flex-col gap-5 bg-presenter-background p-6 text-presenter-text"
    >
      <header className="flex items-center gap-8 text-[20px]">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold tracking-[0.18em] text-presenter-muted uppercase">
            Speaker notes
          </p>
          <p className="truncate font-bold">{deck.title}</p>
        </div>
        <p data-presenter-position className="tabular-nums">
          Slide <b>{position.slide}</b> / {deck.slides.length} · Step <b>{position.step}</b> /{" "}
          {slide.steps}
        </p>
        <AutoAdvanceIndicator autoAdvance={autoAdvance ?? null} />
        <PresenterTimerControls
          elapsed={elapsed}
          paused={paused}
          enabled={connected}
          onTimerCommand={onTimerCommand}
        />
        <time className="tabular-nums text-presenter-muted" dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>
      </header>

      {!connected && connectionMessage && (
        <p
          role="status"
          data-presenter-connection
          className="rounded-md bg-[#ff3c14] px-4 py-2 text-[18px] font-bold"
        >
          {connectionMessage}
        </p>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6">
        <PresenterPreviews deck={deck} position={position} template={template} />
        <PresenterNotes slide={slide} position={position} />
      </main>

      <footer className="flex items-center justify-center text-[18px]">
        <NavigationButtons can={can} dispatch={dispatch} />
      </footer>
    </div>
  );
}
