import { beforeEach, describe, expect, test, vi } from "vitest";

// The loader module keeps mutable memoization state, so each test re-imports it
// against fresh module mocks via vi.resetModules/vi.doMock.
beforeEach(() => {
  vi.resetModules();
});

async function freshLoader() {
  return await import("../../../core/player/exportLibraries");
}

describe("loadExportLibraries", () => {
  test("loads the export libraries once and memoizes the resolved value", async () => {
    class FakePdf {}
    const fakeToJpeg = () => "data:image/jpeg;base64,x";
    let jspdfImports = 0;
    let htmlToImageImports = 0;
    vi.doMock("jspdf", () => {
      jspdfImports += 1;
      return { jsPDF: FakePdf };
    });
    vi.doMock("html-to-image", () => {
      htmlToImageImports += 1;
      return { toJpeg: fakeToJpeg };
    });

    const { loadExportLibraries } = await freshLoader();
    const first = await loadExportLibraries();
    const second = await loadExportLibraries();

    expect(first.jsPDF).toBe(FakePdf);
    expect(first.toJpeg).toBe(fakeToJpeg);
    expect(second).toBe(first);
    expect(jspdfImports).toBe(1);
    expect(htmlToImageImports).toBe(1);
  });

  test("concurrent calls share one in-flight load", async () => {
    let jspdfImports = 0;
    vi.doMock("jspdf", () => {
      jspdfImports += 1;
      return { jsPDF: class {} };
    });
    vi.doMock("html-to-image", () => ({ toJpeg: () => "x" }));

    const { loadExportLibraries } = await freshLoader();
    const [a, b] = await Promise.all([loadExportLibraries(), loadExportLibraries()]);

    expect(a).toBe(b);
    expect(jspdfImports).toBe(1);
  });

  test("a rejected load clears the memo so a retry re-imports", async () => {
    class FakePdf {}
    let attempts = 0;
    vi.doMock("jspdf", () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return { jsPDF: FakePdf };
    });
    vi.doMock("html-to-image", () => ({ toJpeg: () => "x" }));

    const { loadExportLibraries } = await freshLoader();
    await expect(loadExportLibraries()).rejects.toThrow();

    const retried = await loadExportLibraries();
    expect(retried.jsPDF).toBe(FakePdf);
    expect(attempts).toBe(2);
  });

  test("a rejected load lets concurrent callers see the failure, then a retry succeed", async () => {
    let attempts = 0;
    vi.doMock("jspdf", () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return { jsPDF: class {} };
    });
    vi.doMock("html-to-image", () => ({ toJpeg: () => "x" }));

    const { loadExportLibraries } = await freshLoader();
    const [first, second] = await Promise.allSettled([
      loadExportLibraries(),
      loadExportLibraries(),
    ]);
    expect(first.status).toBe("rejected");
    expect(second.status).toBe("rejected");

    await expect(loadExportLibraries()).resolves.toBeTruthy();
    expect(attempts).toBe(2);
  });
});
