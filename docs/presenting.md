# Presenting and export

## Player controls

The footer provides six navigation actions in this order: Previous slide, Previous key frame, Previous step, Next step, Next key frame, and Next slide. It also provides Speaker notes and Export PDF.

Keyboard shortcuts:

| Action                    | Key                        |
| ------------------------- | -------------------------- |
| Previous/next step        | Left/Right; Space advances |
| Previous/next slide       | Up/Down                    |
| Previous/next key frame   | Shift+Left/Shift+Right     |
| First/last slide          | Home/End                   |
| Speaker notes             | `N`                        |
| Fullscreen                | `F`                        |
| Pause/resume auto-advance | `P`                        |

Page Up and Page Down do not navigate. The action group reveals on hover or keyboard focus and remains available on touch devices. Popup, presenter-support and PDF-export errors are announced in a visible footer alert independent of the auto-hidden actions; alerts do not appear in exported footers.

On touch devices, swiping the slide area navigates: left/right for the next/previous step, up/down for the next/previous slide, and a two-finger left/right swipe for key frames. Swipes never start on controls or on interactive slide content: an element that handles its own touch gestures opts out by calling `preventDefault()` on `pointerdown` or by carrying a `data-swipe-ignore` attribute, which also covers everything inside it.

## Auto-advance

Slides may declare how long each build step holds before the player advances automatically. When the current step has a duration, the footer shows a small circular countdown with a pause/play button at its center, and the presenter window shows the same countdown. `P`, or the centered button, pauses and resumes; a pause persists across navigation until resumed. Manual navigation restarts the current step's countdown, and auto-advance stops at the end of the deck.

## Speaker notes

Press `N` or use the footer action to open the presenter window. It shows the current slide's notes, static previews of the current and next step, the main session's elapsed timer, the auto-advance countdown with its pause control, and navigation controls. The main presentation window owns position and both timers; presenter buttons and shortcuts send commands, and the presenter renders full authoritative snapshots without echoing them. `P` pauses or resumes the main countdown from either window.

Hold a navigation key to move through steps, slides, or key frames repeatedly. Snapshot revisions and connection generations prevent older updates or commands from a superseded connection from replacing newer state.

Synchronized notes require BroadcastChannel support. If it is absent or cannot be created, the Speaker notes action visibly explains the limitation and does not open unsynchronized notes. A missed heartbeat leaves notes open in a reconnecting state with remote controls disabled; controls return only after a fresh handshake adopts the current position, rehearsal timer and countdown. The elapsed timer starts with the main presentation session and is not restarted when notes open or reopen. A confirmed main-window close, reload or navigation ends the notes session; `N` in the presenter window closes it locally. If the window does not open, allow pop-ups for the local deck address. Notes are never rendered on the stage or in exported PDF pages.

## PDF export

The export path captures pages at the fixed `1920x1080` stage size and retains the footer while omitting interactive actions. Its hidden capture stage is inert and absent from the accessibility tree, but its settled visual content remains in the PDF. Animated slide content should render its settled state when `useExportMode()` is active. Prefer SVG-native diagram content and avoid `foreignObject`, which browser capture may omit or misplace.

The PDF and capture libraries load on the first export, not at page load. If font preparation, capture or document saving fails, the footer shows an error and releases the export so you can retry; work from an abandoned player cannot download a partial PDF. Exporting does not add a cancel control or change auto-advance. The single-file build embeds the export code too, so it works fully offline.

## Portable presentation

For a single-file handoff, use `pnpm prez`. It writes `dist/prez.html` with emitted JavaScript, CSS, fonts, images, and other local assets embedded. The standalone build is intended for copying or serving as one file; it does not replace the normal folder-based build. Serve the normal `dist/` folder from the root of a static host, not a subfolder, since the build loads `/assets/...` from the site root. To package the showcase deck instead (as the upstream GitHub Pages demo does), run `pnpm prez:showcase`.

The standalone Vite build inlines every image and font itself; the assembler then embeds the scripts and stylesheets and fails if any other file was emitted. Standalone assembly requires the versioned manifest emitted by the matching Vite flavor. If assembly reports a missing or mismatched manifest, rerun the matching command instead of invoking the postprocessor against another build's files. Both commands write to `dist/` by default; maintainers and CI can isolate inputs with separate output directories, for example `OPENPREZ_BUILD_DIR=dist/prez-user pnpm prez` and `OPENPREZ_BUILD_DIR=dist/prez-showcase pnpm prez:showcase`.
