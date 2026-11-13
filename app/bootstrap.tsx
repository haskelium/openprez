import type { Deck, PresentationTemplate } from "@core";
import { templateStyleVariables } from "@core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "../core/player/Player";
import { PresenterView } from "../core/presenter/PresenterView";
import { readPresenterSession } from "../core/presenter/sync";
import "../core/theme/theme.css";

/**
 * Shared composition for every entry: wires one deck and one template into the
 * generic player, or into the presenter window when the URL carries a session.
 * Entry modules pick the deck; everything else lives here so entries cannot drift.
 */
export function bootstrapApp(deck: Deck, template: PresentationTemplate) {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root element");

  const presenterSession = readPresenterSession(window.location.search);
  document.title = presenterSession ? `Speaker notes · ${deck.title}` : deck.title;

  // The theme's Tailwind token chain resolves at :root, so the template's palette and font
  // must be defined there; on a descendant element they would compute to empty.
  const templateVariables = templateStyleVariables(template) as Record<string, string>;
  for (const [name, value] of Object.entries(templateVariables)) {
    document.documentElement.style.setProperty(name, value);
  }

  createRoot(root).render(
    <StrictMode>
      {presenterSession ? (
        <PresenterView deck={deck} sessionId={presenterSession} template={template} />
      ) : (
        <Player deck={deck} template={template} />
      )}
    </StrictMode>,
  );
}
