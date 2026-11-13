import assert from "node:assert/strict";
import {
  evaluate,
  navigate,
  startViteServer,
  stopProcess,
  waitForPage,
  withBrowser,
} from "./browser.mjs";
import { checkPdfExport } from "./pdfExport.mjs";
import { checkPresenterWindows } from "./presenter.mjs";
import { checkFooterAlert, checkShowcaseInteractions } from "./showcase.mjs";
import { checkStandaloneArtifacts, checkStandaloneFixtures } from "./standalone.mjs";

async function checkSmoke(client) {
  await navigate(
    client,
    `data:text/html,${encodeURIComponent('<!doctype html><title>OpenPrez browser smoke</title><main id="app">ready</main>')}`,
  );
  await waitForPage(client, 'document.title === "OpenPrez browser smoke"');
  assert.equal(await evaluate(client, "document.querySelector('#app').textContent"), "ready");
  console.log("Smoke: Chromium started, CDP connected, and a local document rendered.");
}

async function checkDevServerScenarios(client, port) {
  const { server, url } = await startViteServer();
  try {
    await checkShowcaseInteractions(client, url);
    await checkFooterAlert(client, url);
    await checkPdfExport(client, url);
    // Last: it closes the page it drives.
    await checkPresenterWindows(client, port, url);
  } finally {
    await stopProcess(server);
  }
}

withBrowser(async ({ client, port }) => {
  await checkSmoke(client);
  await checkStandaloneFixtures(client);
  await checkStandaloneArtifacts(client);
  await checkDevServerScenarios(client, port);
}).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
