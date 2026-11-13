import { defineDeck, defineSlide } from "@core";
import { TitleSlide } from "./slides/TitleSlide";

export default defineDeck({
  title: "Your Deck Title",
  slides: [
    defineSlide({
      id: "title",
      Component: TitleSlide,
      notes:
        "Starter deck: replace this slide with your own story. Ask your coding agent to run /opp-explore (shape audience, story and look), /opp-propose (review a plan), /opp-apply (build it), then /opp-archive (record the result). Keep deck commits in presentation/ and openprez/ so upstream updates merge cleanly. For inspiration, open /showcase.html on the development server (pnpm dev). Full guide: docs/starting-your-deck.md.",
    }),
  ],
});
