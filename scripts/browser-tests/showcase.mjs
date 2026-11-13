import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { evaluate, navigate, swipe, waitForPage } from "./browser.mjs";
import { showcaseHash } from "./showcaseSlides.mjs";

/** Horizontal gap between two composed words, measured in the given container. */
const WORD_GAP = (container) => `(() => {
  const words = [...(${container}?.querySelectorAll("[data-swipe-ignore]") ?? [])];
  const first = words.find((element) => element.textContent === "If");
  const second = words.find((element) => element.textContent === "JavaScript");
  if (!first?.classList.contains("visible") || !second) return null;
  const x = (element) => Number(/translate\\(([-0-9.]+)px/.exec(element.style.transform)?.[1]);
  return { gap: x(second) - x(first), measured: first.getBoundingClientRect().width + 20 };
})()`;

const WORD_TRANSFORMS =
  '[...document.querySelectorAll("[data-swipe-ignore]")].map((element) => element.style.transform)';

const hasButton = (text) =>
  `[...document.querySelectorAll("button")].some((button) => button.textContent.includes(${JSON.stringify(text)}))`;
const clickButton = (text) =>
  `[...document.querySelectorAll("button")].find((button) => button.textContent.includes(${JSON.stringify(text)})).click()`;

/** Physics slide: touch ownership, font-settled geometry, reduced motion and static rendering. */
export async function checkShowcaseInteractions(client, url) {
  const interactive = showcaseHash("interactive");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

  await navigate(client, `${url}${interactive}`);
  const piece = await waitForPage(
    client,
    `(() => {
      const element = [...document.querySelectorAll("[data-swipe-ignore]")]
        .find((candidate) => candidate.textContent === "JavaScript");
      if (!element?.classList.contains("visible")) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
    30_000,
  );
  const geometry = await evaluate(client, WORD_GAP("document"));
  assert.ok(Math.abs(geometry.gap - geometry.measured) < 1, "word geometry uses loaded fonts");

  await evaluate(
    client,
    "addEventListener('pointerdown', (event) => { window.__pointer = { type: event.pointerType, prevented: event.defaultPrevented }; })",
  );
  await swipe(client, piece, { x: piece.x + 120, y: piece.y + 80 });
  assert.deepEqual(await evaluate(client, "window.__pointer"), { type: "touch", prevented: true });
  assert.equal(await evaluate(client, "location.hash"), interactive);
  await swipe(client, { x: 1750, y: 940 }, { x: 1670, y: 940 });
  await waitForPage(client, `location.hash !== ${JSON.stringify(interactive)}`);
  console.log("Showcase: claimed touch drags do not navigate; unclaimed swipes do.");

  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate(client, `${url}?browser-test=reduced-motion${interactive}`);
  await waitForPage(client, hasButton("Let it fall"), 30_000);
  await evaluate(client, clickButton("Let it fall"));
  await waitForPage(client, hasButton("Rebuild the slide"));
  const collapsed = await evaluate(client, WORD_TRANSFORMS);
  await delay(200);
  assert.deepEqual(await evaluate(client, WORD_TRANSFORMS), collapsed);
  console.log("Showcase: reduced-motion collapse settles immediately.");

  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await navigate(client, `${url}?browser-test=export${interactive}`);
  await waitForPage(client, "Boolean(document.querySelector('button[aria-label=\"Export PDF\"]'))");
  await evaluate(client, "document.querySelector('button[aria-label=\"Export PDF\"]').click()");
  const exportGeometry = await waitForPage(
    client,
    WORD_GAP("document.querySelector('[data-export-capture] [data-slide=\"interactive\"]')"),
    30_000,
  );
  assert.ok(Math.abs(exportGeometry.gap - exportGeometry.measured) < 1);

  await navigate(client, `${url}?presenter=browser-preview${interactive}`);
  const preview = await waitForPage(
    client,
    `(() => {
      const preview = document.querySelector('[data-slide-preview="interactive"]');
      return preview && { inert: preview.inert, hidden: preview.getAttribute("aria-hidden") };
    })()`,
    30_000,
  );
  assert.deepEqual(preview, { inert: true, hidden: "true" });
  console.log("Showcase: export captures and presenter previews are settled and inert.");
}

/** A keyboard-triggered error stays visible on a hover-capable desktop with hidden actions. */
export async function checkFooterAlert(client, url) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: false, maxTouchPoints: 1 });
  await client.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      { name: "hover", value: "hover" },
      { name: "pointer", value: "fine" },
    ],
  });
  await navigate(client, `${url}?browser-test=alert#/1/1`);
  await waitForPage(client, 'Boolean(document.querySelector(".footer-actions"))');
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await evaluate(
    client,
    `(() => {
      const hidden = document.createElement("style");
      hidden.textContent = ".footer-actions { opacity: 0 !important }";
      document.head.append(hidden);
      window.open = () => null;
      dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true, cancelable: true }));
    })()`,
  );
  const alert = await waitForPage(
    client,
    `(() => {
      const alert = document.querySelector('[role="alert"]');
      const actions = document.querySelector(".footer-actions");
      // Wait out the actions' fade so the assertion sees them fully hidden.
      if (!alert || getComputedStyle(actions).opacity !== "0") return null;
      return {
        text: alert.textContent,
        height: alert.getBoundingClientRect().height,
        actionsOpacity: getComputedStyle(actions).opacity,
        focusInActions: actions.contains(document.activeElement),
      };
    })()`,
  );
  assert.match(alert.text, /Allow pop-ups to open speaker notes/);
  assert.ok(alert.height > 0);
  assert.equal(alert.actionsOpacity, "0");
  assert.equal(alert.focusInActions, false);
  console.log("Footer: action errors remain visible without hover or focus.");
}
