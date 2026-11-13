import { defineDeck, defineSlide } from "@core";
import { AnywhereSlide } from "./slides/AnywhereSlide";
import { ClosingSlide } from "./slides/ClosingSlide";
import { DeckIsCodeSlide } from "./slides/DeckIsCodeSlide";
import { DilemmaSlide } from "./slides/DilemmaSlide";
import { InteractiveSlide } from "./slides/InteractiveSlide";
import { LayersSlide } from "./slides/LayersSlide";
import { NoTwoAlikeSlide } from "./slides/NoTwoAlikeSlide";
import { PresenterSlide } from "./slides/PresenterSlide";
import { SpecToSlideSlide } from "./slides/SpecToSlideSlide";
import { TitleSlide } from "./slides/TitleSlide";
import { WorkflowSlide } from "./slides/WorkflowSlide";

export default defineDeck({
  title: "OpenPrez",
  defaultAutoAdvance: 8,
  slides: [
    defineSlide({
      id: "title",
      autoAdvance: 10,
      Component: TitleSlide,
      notes:
        "Welcome. OpenPrez is about one idea: creative freedom with engineered outcomes. Every slide is composed for its message, and every result matches what you specified.",
    }),
    defineSlide({
      id: "dilemma",
      steps: 4,
      autoAdvance: [3, 3, 3],
      tone: "inverse",
      Component: DilemmaSlide,
      notes:
        "[[step:1]] Two axes: creative freedom, and control over the outcome. Where do AI slide tools sit today? [[step:2]] Template tools: you get what you asked for, but every deck looks the same. [[step:3]] Free-form generation: fresh, but rarely on brief; you re-prompt until something sticks. [[step:4]] OpenPrez aims top-right: free in form, controlled in outcome. The rest of this talk is how.",
    }),
    defineSlide({
      id: "no-two-alike",
      steps: 3,
      autoAdvance: [3, 3],
      Component: NoTwoAlikeSlide,
      notes:
        "[[step:1]] The agent composes each slide for its message: an orbit, a timeline. [[step:2]] A giant number, a split. No layout library, no stock grid. [[step:3]] A route, a chart. Notice the one thing they share: the frame and its footer. That constant is the framework.",
    }),
    defineSlide({
      id: "deck-is-code",
      steps: 3,
      autoAdvance: [3, 3],
      Component: DeckIsCodeSlide,
      notes:
        "[[step:1]] A slide is a React component plus a short declaration: an id and its component. [[step:2]] The build is part of the source: steps: 3, one idea per step. [[step:3]] Speaker notes live in the source too, tied to steps, and only ever appear in the presenter view.",
    }),
    defineSlide({
      id: "interactive",
      autoAdvance: 20,
      Component: InteractiveSlide,
      notes:
        "This slide is a web page, and it runs any JavaScript you give it. Right now it runs a physics engine and a live clock. Grab the title and throw it, or press Let it fall: everything collapses, flies anywhere, and lands on the footer. Charts, live data, any npm package, bundled locally, no network needed. Rebuild the slide. And notice: whatever the code does, it never broke the frame. Why? Let's take a slide apart.",
    }),
    defineSlide({
      id: "layers",
      steps: 4,
      Component: LayersSlide,
      notes:
        "[[step:1]] This is the slide you are looking at, taken apart. The bottom layer is core, and it is fixed: player, stage, steps, presenter window, PDF export. [[step:2]] The template is fixed per deck: palette, tones, typography and footer. [[step:3]] The presentation layer is free: your slides, notes and assets. Lint rules keep the seams clean. [[step:4]] Swap the template and the same deck takes a new look, without touching a slide.",
    }),
    defineSlide({
      id: "workflow",
      steps: 6,
      autoAdvance: [4, 4, 4, 4, 4],
      Component: WorkflowSlide,
      notes:
        "[[step:1]] Everything starts from one markdown document: presentation.md, the canonical story. [[step:2]] Explore: think the story through with the agent. Nothing is edited. [[step:3]] Propose: the agent writes a plan (proposal, content, design, tasks) for you to review. [[step:4]] Apply: only the approved plan is built, then pnpm check validates it. [[step:5]] Archive: the accepted content syncs back into the story, and the history is kept. [[step:6]] Same loop, two ways in: a new deck (reset to the starter, then plan the whole story) or a change to one slide or section of an existing deck.",
    }),
    defineSlide({
      id: "spec-to-slide",
      steps: 5,
      autoAdvance: [3, 3, 3, 3],
      Component: SpecToSlideSlide,
      notes:
        "[[step:1]] This is why the outcome matches your expectations. Left: an approved spec entry. Right: an empty frame. [[step:2]] The message line becomes the headline. [[step:3]] steps: 3 becomes the build, one claim per step. [[step:4]] tone: inverse becomes the surface; the template decides the exact colors. [[step:5]] The notes intent becomes the presenter's line, never on stage. Every element traces back to a line you approved.",
    }),
    defineSlide({
      id: "presenter",
      steps: 5,
      autoAdvance: [4, 4, 4, 4],
      Component: PresenterSlide,
      notes:
        "[[step:1]] The audience sees only the slide. [[step:2]] You get a cockpit: a preview of where you are and of the next step. [[step:3]] Speaker notes tied to build steps: the current passage is marked, the next one is ready to read ahead. [[step:4]] Navigate from either window and both stay in sync. The timer keeps you on pace, with a pause and a reset for rehearsals. [[step:5]] Hands on the keys: arrows for steps and slides, Shift for key frames, N for notes, F for full screen.",
    }),
    defineSlide({
      id: "anywhere",
      steps: 3,
      autoAdvance: [4, 4],
      Component: AnywhereSlide,
      notes:
        "[[step:1]] Run pnpm prez and get one self-contained prez.html file: its JavaScript, CSS and local assets travel inside it. [[step:2]] Hand it over and open it locally: no Wi-Fi, no Node and no presentation server. [[step:3]] Need a handout? Export the same deck's key frames into one landscape PDF, straight from the footer.",
    }),
    defineSlide({
      id: "closing",
      Component: ClosingSlide,
      notes:
        "Back to where we started: creative freedom, engineered outcomes. Every slide you just saw was composed differently, and every one sits in the same frame. Get the code at github.com/haskelium/openprez: pnpm dev to open the starter, /opp-explore to shape your story, pnpm prez to share it. Thank you.",
    }),
  ],
});
