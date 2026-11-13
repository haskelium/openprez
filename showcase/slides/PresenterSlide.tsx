import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Timer,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

const PREVIEWS_STEP = 2;
const NOTES_STEP = 3;
const SYNC_STEP = 4;
const KEYS_STEP = 5;

const keyBindings = [
  { keys: ["←", "→"], action: "step" },
  { keys: ["↑", "↓"], action: "slide" },
  { keys: ["⇧"], action: "key frame" },
  { keys: ["N"], action: "notes" },
  { keys: ["F"], action: "full screen" },
];

interface Feature {
  step: number;
  title: string;
  detail: ReactNode;
}

const features: Feature[] = [
  { step: PREVIEWS_STEP, title: "Now and next", detail: "previews of this step and the next one" },
  {
    step: NOTES_STEP,
    title: "Notes tied to steps",
    detail: "the current passage marked, the next one ready",
  },
  {
    step: SYNC_STEP,
    title: "Two-way sync",
    detail: "navigate from either window; timer with pause and reset",
  },
  {
    step: KEYS_STEP,
    title: "Hands on the keys",
    detail: (
      <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {keyBindings.map((binding) => (
          <span key={binding.action} className="inline-flex items-center gap-1.5">
            {binding.keys.map((key) => (
              <Key key={key}>{key}</Key>
            ))}
            <span className="ml-1">{binding.action}</span>
          </span>
        ))}
      </span>
    ),
  },
];

export function PresenterSlide({ step }: SlideProps) {
  return (
    <div className="relative h-full">
      <h2 className="absolute top-20 left-32 text-[64px] leading-none font-bold tracking-tight">
        The presenter view: your private cockpit.
      </h2>

      <div className="absolute top-[230px] left-32 w-[520px]">
        <p className="mb-3 text-[20px] font-bold tracking-[0.2em] text-theme-neutral uppercase">
          Audience sees
        </p>
        <AudienceScreen />
        <FeatureList step={step} />
      </div>

      <SyncLink step={step} />
      <PresenterWindow step={step} />
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-10 items-center justify-center rounded-md border-2 border-theme-accent4 bg-theme-accent1 px-2 font-mono text-[20px] font-bold text-theme-accent5">
      {children}
    </kbd>
  );
}

function AudienceScreen() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-video w-full flex-col rounded-xl bg-theme-accent5 p-7 text-theme-on-primary shadow-2xl ring-4 ring-theme-accent4"
    >
      <span className="text-[34px] leading-none font-bold">Freedom with a frame</span>
      <div className="mt-5 grid flex-1 grid-cols-3 gap-3">
        <span className="rounded-lg bg-theme-accent2" />
        <span className="rounded-lg bg-theme-accent2" />
        <span className="rounded-lg bg-theme-accent2/20" />
      </div>
    </div>
  );
}

function FeatureList({ step }: { step: number }) {
  const allowance = useMotionAllowance();
  return (
    <ol className="mt-7 flex flex-col gap-4">
      {features.map((feature) => {
        const visible = step >= feature.step;
        const current = step === feature.step;
        return (
          <motion.li
            key={feature.title}
            initial={false}
            animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -20 }}
            transition={stepTransition(allowance, 0.4)}
          >
            <p className={`text-[26px] font-bold ${current ? "text-theme-data2" : ""}`}>
              {feature.title}
            </p>
            <div className="mt-1 text-[20px] leading-snug text-theme-neutral">{feature.detail}</div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/** Pulses travel both ways between the windows once sync is the topic. */
function SyncLink({ step }: { step: number }) {
  const allowance = useMotionAllowance();
  const visible = step >= PREVIEWS_STEP;
  const emphasized = step >= SYNC_STEP;
  const pulsing = emphasized && allowance.ambient;

  return (
    <motion.svg
      viewBox="0 0 120 80"
      className="absolute top-[370px] left-[660px] h-20 w-[120px]"
      aria-hidden="true"
      initial={false}
      animate={{ opacity: visible ? (emphasized ? 1 : 0.35) : 0 }}
      transition={stepTransition(allowance, 0.4)}
    >
      <line x1="8" y1="28" x2="112" y2="28" stroke="var(--color-theme-data2)" strokeWidth="4" />
      <path d="M 100 20 L 114 28 L 100 36 Z" fill="var(--color-theme-data2)" />
      <line x1="8" y1="52" x2="112" y2="52" stroke="var(--color-theme-data2)" strokeWidth="4" />
      <path d="M 20 44 L 6 52 L 20 60 Z" fill="var(--color-theme-data2)" />
      {pulsing && (
        <>
          <motion.circle
            cy="28"
            r="7"
            fill="var(--color-theme-accent5)"
            animate={{ cx: [10, 106] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <motion.circle
            cy="52"
            r="7"
            fill="var(--color-theme-accent5)"
            animate={{ cx: [110, 14] }}
            transition={{
              duration: 1.2,
              delay: 0.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        </>
      )}
    </motion.svg>
  );
}

function PresenterWindow({ step }: { step: number }) {
  const allowance = useMotionAllowance();
  const visible = step >= PREVIEWS_STEP;

  return (
    <motion.div
      className="absolute top-[200px] right-32 flex h-[740px] w-[1000px] flex-col gap-5 rounded-2xl bg-presenter-background p-7 text-presenter-text shadow-2xl ring-2 ring-presenter-border"
      style={{ fontFamily: "system-ui, sans-serif" }}
      initial={false}
      animate={{ opacity: visible ? 1 : 0.12, y: visible ? 0 : 30 }}
      transition={stepTransition(allowance, 0.55)}
    >
      <header className="flex items-center gap-6 text-[20px]">
        <div className="flex-1">
          <p className="text-[15px] font-bold tracking-[0.18em] text-presenter-muted uppercase">
            Speaker notes
          </p>
          <p className="font-bold">OpenPrez</p>
        </div>
        <p className="tabular-nums">
          Slide <b>8</b> / 10 · Step <b>2</b> / 3
        </p>
        <Highlight active={step === SYNC_STEP} className="rounded-full">
          <span className="flex items-center gap-3 rounded-full bg-presenter-surface py-1.5 pr-1.5 pl-4 ring-1 ring-presenter-border">
            <Timer aria-hidden="true" className="size-5" />
            <b className="tabular-nums">07:42</b>
            <span className="flex items-center gap-1">
              <span className="flex size-9 items-center justify-center rounded-full">
                <Pause aria-hidden="true" className="size-5" />
              </span>
              <span className="flex size-9 items-center justify-center rounded-full">
                <RotateCcw aria-hidden="true" className="size-5" />
              </span>
            </span>
          </span>
        </Highlight>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[5fr_6fr] gap-5">
        <Highlight active={step === PREVIEWS_STEP} className="rounded-xl">
          <div className="flex flex-col gap-3 p-1">
            <PaneLabel>Now</PaneLabel>
            <MiniPreview claims={2} />
            <PaneLabel>Next</PaneLabel>
            <div className="w-3/4">
              <MiniPreview claims={3} />
            </div>
          </div>
        </Highlight>
        <Highlight active={step === NOTES_STEP} className="rounded-xl">
          <NotesPane />
        </Highlight>
      </div>

      <footer className="flex items-center justify-center gap-4 text-presenter-text">
        {navigationIcons.map(({ name, Icon }) => (
          <span
            key={name}
            className="flex size-11 items-center justify-center rounded-md bg-presenter-surface"
          >
            <Icon aria-hidden="true" className="size-6" />
          </span>
        ))}
      </footer>
    </motion.div>
  );
}

const navigationIcons = [
  { name: "previous slide", Icon: ChevronsLeft },
  { name: "previous key frame", Icon: SkipBack },
  { name: "previous step", Icon: ChevronLeft },
  { name: "next step", Icon: ChevronRight },
  { name: "next key frame", Icon: SkipForward },
  { name: "next slide", Icon: ChevronsRight },
];

function PaneLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[14px] font-bold tracking-[0.18em] text-presenter-muted uppercase">
      {children}
    </p>
  );
}

function MiniPreview({ claims }: { claims: number }) {
  return (
    <div className="flex aspect-[1920/1016] w-full flex-col rounded-lg bg-theme-accent5 p-3 text-theme-on-primary">
      <span className="text-[15px] leading-none font-bold">Freedom with a frame</span>
      <div className="mt-2 grid flex-1 grid-cols-3 gap-1.5">
        {[1, 2, 3].map((claim) => (
          <span
            key={claim}
            className={`rounded ${claim <= claims ? "bg-theme-accent2" : "bg-theme-accent2/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

function NotesPane() {
  return (
    <div className="h-full rounded-xl bg-presenter-surface p-6 text-[24px] leading-relaxed ring-1 ring-presenter-border">
      <p>
        <NoteBadge tone="other">1</NoteBadge>
        Open it with N, or the Speaker notes button.{" "}
        <span className="box-decoration-clone rounded-sm bg-presenter-now-soft font-semibold">
          <NoteBadge tone="now">2 NOW</NoteBadge>
          Notes follow your build steps — the current passage is marked.
        </span>{" "}
        <span className="box-decoration-clone rounded-sm bg-presenter-next-soft">
          <NoteBadge tone="next">3 NEXT</NoteBadge>
          Read ahead: the next passage is already visible.
        </span>
      </p>
    </div>
  );
}

function NoteBadge({ tone, children }: { tone: "now" | "next" | "other"; children: ReactNode }) {
  const style =
    tone === "now"
      ? "bg-presenter-now text-presenter-ink"
      : tone === "next"
        ? "bg-presenter-next text-presenter-ink"
        : "bg-presenter-step text-presenter-ink";
  return (
    <span
      className={`mx-1 inline-flex items-center rounded-full px-2 py-0.5 align-middle text-[15px] font-bold leading-tight ${style}`}
    >
      {children}
    </span>
  );
}

function Highlight({
  active,
  className,
  children,
}: {
  active: boolean;
  className: string;
  children: ReactNode;
}) {
  const allowance = useMotionAllowance();
  return (
    <div className={`relative ${className}`}>
      {children}
      <motion.span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-2 ring-4 ring-theme-data2 ${className}`}
        initial={false}
        animate={{ opacity: active ? 1 : 0 }}
        transition={stepTransition(allowance, 0.35)}
      />
    </div>
  );
}
