import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluate, navigate, waitFor, waitForPage } from "./browser.mjs";

/** One full PDF download, with the hidden capture stage excluded from focus and pointer input. */
export async function checkPdfExport(client, url) {
  const downloads = await mkdtemp(join(tmpdir(), "openprez-pdf-download-"));
  try {
    await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
    await navigate(client, new URL("/", url).href);
    await waitForPage(
      client,
      "Boolean(document.querySelector('button[aria-label=\"Export PDF\"]'))",
      30_000,
    );
    await evaluate(client, "document.querySelector('button[aria-label=\"Export PDF\"]').click()");
    await waitForPage(client, "Boolean(document.querySelector('[data-export-host]'))", 30_000);

    const focus = await evaluate(
      client,
      `(() => {
        const host = document.querySelector("[data-export-host]");
        const probe = host.appendChild(document.createElement("button"));
        probe.focus();
        const state = { inert: host.inert, hidden: host.getAttribute("aria-hidden"), focused: document.activeElement === probe };
        probe.remove();
        return state;
      })()`,
    );
    assert.deepEqual(focus, { inert: true, hidden: "true", focused: false });

    // Move the hidden host on screen and click where a probe sits: inert content must not react.
    await evaluate(
      client,
      `(() => {
        const host = document.querySelector("[data-export-host]");
        window.__hostStyle = host.getAttribute("style");
        Object.assign(host.style, { left: "0px", pointerEvents: "auto", zIndex: "2147483647" });
        const probe = host.appendChild(document.createElement("button"));
        probe.id = "pointer-probe";
        probe.style.cssText = "position:fixed;left:0;top:0;width:100px;height:100px";
        probe.addEventListener("pointerdown", () => { window.__pointerReceived = true; });
      })()`,
    );
    for (const type of ["mousePressed", "mouseReleased"]) {
      await client.send("Input.dispatchMouseEvent", {
        type,
        x: 10,
        y: 10,
        button: "left",
        clickCount: 1,
      });
    }
    const pointer = await evaluate(
      client,
      `(() => {
        const host = document.querySelector("[data-export-host]");
        const probe = document.querySelector("#pointer-probe");
        const state = { received: window.__pointerReceived === true, hit: document.elementFromPoint(10, 10) === probe };
        probe.remove();
        host.setAttribute("style", window.__hostStyle);
        return state;
      })()`,
    );
    assert.deepEqual(pointer, { received: false, hit: false });

    const pdf = await waitFor(
      async () => {
        const name = (await readdir(downloads)).find((candidate) => candidate.endsWith(".pdf"));
        if (!name) return null;
        const contents = await readFile(join(downloads, name));
        return contents.subarray(0, 5).toString() === "%PDF-" ? contents : null;
      },
      { timeoutMs: 60_000 },
    );
    assert.ok(pdf.length > 1000, "the downloaded PDF contains document data");
    console.log("PDF export: a complete PDF downloaded; the hidden capture stage takes no input.");
  } finally {
    await rm(downloads, { recursive: true, force: true });
  }
}
