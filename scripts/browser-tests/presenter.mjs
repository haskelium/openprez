import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import {
  click,
  connectPage,
  evaluate,
  listPageTargets,
  navigate,
  pressKey,
  waitFor,
  waitForPage,
} from "./browser.mjs";
import { showcaseSlide } from "./showcaseSlides.mjs";

const presenterShows = (text) =>
  `Boolean(document.querySelector("[data-presenter-position]")?.textContent.includes(${JSON.stringify(text)}))`;
const PRESENTER_CONNECTED =
  'Boolean(document.querySelector("[data-presenter-position]")) && !document.querySelector("[data-presenter-connection]")';
const clickLabel = (label) => `document.querySelector('button[aria-label="${label}"]').click()`;

/**
 * Page-side BroadcastChannel interception: `delay` holds main snapshots for manual release,
 * `drop` discards snapshots and heartbeats (a suspended main window), `holdCommand` keeps the
 * next presenter command so it can be delivered after its connection is superseded.
 */
const INSTALL_CHANNEL_CONTROL = `(() => {
  const post = BroadcastChannel.prototype.postMessage;
  window.__channel = { mode: "pass", held: [], post };
  BroadcastChannel.prototype.postMessage = function (message) {
    const control = window.__channel;
    const type = message?.type;
    if (control.mode === "delay" && type === "snapshot") return control.held.push({ channel: this, message });
    if (control.mode === "drop" && (type === "snapshot" || type === "heartbeat")) return;
    if (control.mode === "holdCommand" && type === "command") {
      control.mode = "pass";
      return control.held.push({ channel: this, message });
    }
    return post.call(this, message);
  };
})()`;
const release = (which) =>
  `(() => { const { held, post } = window.__channel; const item = held.${which}(); post.call(item.channel, item.message); })()`;

/** Two real windows: commands, reordering, heartbeat loss and recovery, and shutdown. */
export async function checkPresenterWindows(client, port, url) {
  const slide = showcaseSlide("dilemma");
  assert.equal(showcaseSlide("no-two-alike"), slide + 1, "scenario expects consecutive slides");
  const mainAt = (step, onSlide = slide) =>
    waitForPage(client, `location.hash === "#/${onSlide}/${step}"`);

  await navigate(client, `${url}?browser-test=presenter#/${slide}/1`);
  await waitForPage(
    client,
    "Boolean(document.querySelector('button[aria-label=\"Speaker notes\"]'))",
    30_000,
  );
  // Pause the slide's auto-advance first, so its countdown cannot move the deck mid-scenario.
  await pressKey(client, "p");
  await waitForPage(
    client,
    "Boolean(document.querySelector('button[aria-label=\"Resume auto-advance\"]'))",
  );
  await click(client, 'button[aria-label="Speaker notes"]');
  const target = await waitFor(
    async () =>
      (await listPageTargets(port)).find(
        (page) => page.url.includes("presenter=") && page.webSocketDebuggerUrl,
      ) ?? null,
    { timeoutMs: 30_000 },
  );
  const presenter = await connectPage(target.webSocketDebuggerUrl);
  try {
    await waitForPage(presenter, PRESENTER_CONNECTED, 30_000);
    await waitForPage(
      presenter,
      "Boolean(document.querySelector('button[aria-label=\"Resume auto-advance\"]'))",
    );
    await evaluate(presenter, clickLabel("Reset timer"));
    await evaluate(presenter, clickLabel("Pause timer"));
    await waitForPage(
      presenter,
      'document.querySelector("[data-presenter-timer-paused]") !== null',
    );

    await pressKey(presenter, "ArrowRight");
    await mainAt(2);
    await waitForPage(presenter, presenterShows("Step 2 /"));
    console.log("Presenter: commands from the notes window drive the main window.");

    await evaluate(client, INSTALL_CHANNEL_CONTROL);
    await evaluate(client, 'window.__channel.mode = "delay"');
    await pressKey(client, "ArrowRight");
    await mainAt(3);
    await pressKey(client, "ArrowRight");
    await mainAt(4);
    await evaluate(client, release("pop"));
    await waitForPage(presenter, presenterShows("Step 4 /"));
    await evaluate(client, release("shift"));
    await delay(100);
    assert.ok(await evaluate(presenter, presenterShows("Step 4 /")), "older snapshot was ignored");
    console.log("Presenter: a delayed older snapshot never replaces a newer one.");

    await evaluate(presenter, INSTALL_CHANNEL_CONTROL);
    await evaluate(presenter, 'window.__channel.mode = "holdCommand"');
    await pressKey(presenter, "ArrowRight");
    await evaluate(client, 'window.__channel.mode = "drop"');
    await waitForPage(
      presenter,
      'Boolean(document.querySelector("[data-presenter-connection]"))',
      10_000,
    );
    assert.equal(
      await evaluate(
        presenter,
        "document.querySelector('button[aria-label=\"Next step\"]').disabled",
      ),
      true,
    );
    await pressKey(presenter, "ArrowRight");
    await delay(100);
    await mainAt(4);
    assert.equal(
      await evaluate(
        client,
        'document.querySelector(\'button[aria-label="Speaker notes"]\').getAttribute("aria-pressed")',
      ),
      "true",
      "temporary heartbeat loss keeps notes open",
    );

    // The main window moves on while the notes are disconnected, then becomes reachable again.
    await pressKey(client, "ArrowRight");
    await mainAt(1, slide + 1);
    await evaluate(client, 'window.__channel.mode = "pass"');
    await waitForPage(
      presenter,
      `${PRESENTER_CONNECTED} && ${presenterShows(`Slide ${slide + 1} /`)}`,
      15_000,
    );
    assert.equal(
      await evaluate(
        presenter,
        'document.querySelector("[data-presenter-timer]").textContent.includes("00:00")',
      ),
      true,
    );
    assert.ok(
      await evaluate(presenter, 'document.querySelector("[data-presenter-timer-paused]") !== null'),
    );
    assert.ok(
      await evaluate(
        presenter,
        "document.querySelector('button[aria-label=\"Resume auto-advance\"]') !== null",
      ),
    );

    await evaluate(presenter, release("pop"));
    await delay(100);
    await mainAt(1, slide + 1);
    console.log(
      "Presenter: liveness restores one current snapshot; superseded commands are rejected.",
    );

    await client.send("Page.close");
    await waitFor(
      async () => (await listPageTargets(port)).every((page) => !page.url.includes("presenter=")),
      { timeoutMs: 10_000 },
    );
    console.log("Presenter: closing the main window closes its notes window.");
  } finally {
    await presenter.close();
  }
}
