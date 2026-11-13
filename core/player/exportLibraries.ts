/**
 * Runtime exports of the lazily loaded PDF/capture libraries. The heavy `jspdf` and
 * `html-to-image` modules parse on first export activation instead of at page load;
 * the standalone build inlines these dynamic imports, keeping `prez.html` self-contained.
 */
export interface ExportLibraries {
  readonly jsPDF: typeof import("jspdf").jsPDF;
  readonly toJpeg: typeof import("html-to-image").toJpeg;
}

let loaded: Promise<ExportLibraries> | null = null;

/** Loads the export libraries on first use and memoizes the resolved promise. */
export function loadExportLibraries(): Promise<ExportLibraries> {
  loaded ??= (async () => {
    try {
      const [{ jsPDF }, { toJpeg }] = await Promise.all([import("jspdf"), import("html-to-image")]);
      return { jsPDF, toJpeg };
    } catch (error) {
      // A failed load must not poison the session: the next call retries the import.
      loaded = null;
      throw error;
    }
  })();
  return loaded;
}
