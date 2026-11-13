import type { ExportFooterRenderProps, FooterRenderProps } from "@core";
import { ActionButton, AutoAdvanceIndicator, Logo, NavigationButtons } from "@core";
import { FileDown, NotebookText } from "lucide-react";
import { FooterLeaves } from "./FooterLeaves";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Autumn imagery behind the footer chrome: maple-leaf crowns kept clear of the
 * text, and a maple-to-goldenrod border replacing a plain rule.
 */
function FooterBackdrop() {
  return (
    <>
      <FooterLeaves />
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          background:
            "linear-gradient(to right, var(--color-theme-accent2), var(--color-theme-accent3) 50%, var(--color-theme-data2))",
        }}
      />
    </>
  );
}

/** Left brand zone: the logo and the copyright line. */
function BrandZone({
  copyrightNotice,
  Brand = Logo,
}: {
  copyrightNotice: string;
  Brand?: FooterRenderProps["Brand"];
}) {
  return (
    <div className="relative flex items-center gap-6">
      <Brand className="h-6 shrink-0" />
      <span data-copyright>{copyrightNotice}</span>
    </div>
  );
}

/** Standard footer shown on every live slide; the player owns it, slides cannot remove it. */
export function Footer({ controls, date, copyrightNotice, Brand }: FooterRenderProps) {
  const {
    can,
    dispatch,
    onExportPdf,
    exporting,
    exportError,
    notesOpen,
    onToggleNotes,
    notesError,
  } = controls;
  const alert = exportError ?? notesError;

  return (
    <footer
      data-footer
      className="relative grid h-full grid-cols-[1fr_auto_1fr] items-center gap-8 bg-surface px-12 font-body text-[18px] text-on-surface"
    >
      <FooterBackdrop />
      <BrandZone copyrightNotice={copyrightNotice ?? defaultCopyrightNotice(date)} Brand={Brand} />
      <div className="relative flex items-center justify-center">
        <div className="footer-actions relative flex items-center gap-1">
          <NavigationButtons can={can} dispatch={dispatch} />
          <ActionButton
            label="Speaker notes"
            Icon={NotebookText}
            enabled
            pressed={notesOpen}
            onPress={onToggleNotes}
          />
          <ActionButton
            label={exporting ? "Exporting PDF" : "Export PDF"}
            Icon={FileDown}
            enabled={!exporting}
            onPress={onExportPdf}
          />
          {exporting && (
            <span role="status" className="sr-only">
              Preparing PDF
            </span>
          )}
        </div>
        {alert && (
          <span
            role="alert"
            className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[700px] -translate-x-1/2 rounded bg-on-surface px-3 py-1.5 text-center text-base whitespace-normal text-surface shadow-lg"
          >
            {alert}
          </span>
        )}
      </div>
      <div className="relative flex items-center justify-end gap-8">
        <AutoAdvanceIndicator autoAdvance={controls.autoAdvance ?? null} />
        <time data-date dateTime={toIsoDate(date)}>
          {dateFormat.format(date)}
        </time>
        <span data-counter className="tabular-nums">
          {controls.slide} / {controls.total}
        </span>
      </div>
    </footer>
  );
}

/** Footer for exported PDF pages: branded, with the same left and right zones but no actions. */
export function ExportFooter({
  date,
  copyrightNotice,
  page,
  total,
  Brand,
}: ExportFooterRenderProps) {
  return (
    <footer
      data-footer
      data-pdf-footer
      className="relative grid h-full grid-cols-[1fr_auto_1fr] items-center gap-8 bg-surface px-12 font-body text-[18px] text-on-surface"
    >
      <FooterBackdrop />
      <BrandZone copyrightNotice={copyrightNotice ?? defaultCopyrightNotice(date)} Brand={Brand} />
      <div aria-hidden="true" />
      <div className="relative flex items-center justify-end gap-8">
        <time data-date dateTime={toIsoDate(date)}>
          {dateFormat.format(date)}
        </time>
        <span data-counter className="tabular-nums">
          {page} / {total}
        </span>
      </div>
    </footer>
  );
}

function defaultCopyrightNotice(date: Date): string {
  return `Copyright © ${date.getFullYear()} Haskelium`;
}

function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
