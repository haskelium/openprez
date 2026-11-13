import assert from "node:assert/strict";
import { access, chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  waitForDevtoolsPort: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("../../../scripts/browser-tests/cdp.mjs", () => ({
  CdpClient: { connect: mocks.connect },
  waitFor: vi.fn(),
  waitForDevtoolsPort: mocks.waitForDevtoolsPort,
}));

import { withBrowser } from "../../../scripts/browser-tests/browser.mjs";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.waitForDevtoolsPort.mockReset();
  mocks.connect.mockReset();
});

describe.skipIf(process.platform === "win32")("browser startup", () => {
  async function fixture(run) {
    const directory = await mkdtemp(join(tmpdir(), "openprez-browser-test-"));
    try {
      const executable = join(directory, "chromium");
      await writeFile(executable, "#!/bin/sh\nexec sleep 60\n");
      await chmod(executable, 0o755);
      vi.stubEnv("OPENPREZ_BROWSER", executable);
      await run();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  it("retries startup with a fresh profile and runs the scenario once", async () => {
    await fixture(async () => {
      mocks.waitForDevtoolsPort.mockRejectedValueOnce(new Error("startup timed out"));
      mocks.waitForDevtoolsPort.mockResolvedValueOnce(1234);
      const client = { send: vi.fn(), close: vi.fn() };
      mocks.connect.mockResolvedValue(client);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [{ type: "page", webSocketDebuggerUrl: "ws://localhost" }],
        }),
      );
      const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
      const scenario = vi.fn();

      await withBrowser(scenario);

      assert.equal(scenario.mock.calls.length, 1);
      assert.equal(mocks.waitForDevtoolsPort.mock.calls.length, 2);
      const profiles = mocks.waitForDevtoolsPort.mock.calls.map(([profile]) => profile);
      assert.notEqual(profiles[0], profiles[1]);
      for (const profile of profiles) await assert.rejects(access(profile));
      assert.deepEqual(warning.mock.calls, [
        ["Browser startup failed; retrying with a fresh profile."],
      ]);
      assert.equal(client.close.mock.calls.length, 1);
    });
  });

  it("does not retry a failing scenario", async () => {
    await fixture(async () => {
      mocks.waitForDevtoolsPort.mockResolvedValue(1234);
      mocks.connect.mockResolvedValue({ send: vi.fn(), close: vi.fn() });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [{ type: "page", webSocketDebuggerUrl: "ws://localhost" }],
        }),
      );
      await assert.rejects(
        withBrowser(() => {
          throw new Error("scenario failed");
        }),
        /scenario failed/,
      );
      assert.equal(mocks.waitForDevtoolsPort.mock.calls.length, 1);
    });
  });

  it("reports browser stderr after both startup attempts fail", async () => {
    await fixture(async () => {
      await writeFile(process.env.OPENPREZ_BROWSER, "#!/bin/sh\necho 'launch error' >&2\nexit 1\n");
      mocks.waitForDevtoolsPort.mockImplementation(
        async (_profile, child) =>
          new Promise((_, reject) => {
            child.once("exit", () => reject(new Error("browser exited")));
          }),
      );
      vi.spyOn(console, "warn").mockImplementation(() => {});

      await assert.rejects(withBrowser(vi.fn()), /browser exited[\s\S]*launch error/);
      assert.equal(mocks.waitForDevtoolsPort.mock.calls.length, 2);
      const profiles = mocks.waitForDevtoolsPort.mock.calls.map(([profile]) => profile);
      for (const profile of profiles) await assert.rejects(access(profile));
    });
  });
});
