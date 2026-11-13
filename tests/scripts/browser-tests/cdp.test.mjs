import assert from "node:assert/strict";
import { it } from "vitest";
import { waitForDevtoolsPort } from "../../../scripts/browser-tests/cdp.mjs";

it("reports a browser terminated by signal without waiting for the timeout", async () => {
  await assert.rejects(
    waitForDevtoolsPort("/nonexistent", { exitCode: null, signalCode: "SIGTERM" }),
    /Browser exited before CDP startup \(signal SIGTERM\)/,
  );
});
