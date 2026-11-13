import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import { Lock } from "lucide-react";
import { motion } from "motion/react";

interface CodeLine {
  indent: boolean;
  key?: string;
  value: string;
  /** Build step whose idea this line carries; null for the call's frame. */
  focus: number | null;
}

const code: CodeLine[] = [
  { indent: false, value: "defineSlide({", focus: null },
  { indent: true, key: "id", value: '"pitch",', focus: 1 },
  { indent: true, key: "Component", value: "PitchSlide,", focus: 1 },
  { indent: true, key: "steps", value: "3,", focus: 2 },
  { indent: true, key: "notes", value: '"[[step:2]] Pause here.",', focus: 3 },
  { indent: false, value: "})", focus: null },
];

const legend = ["structure", "build steps", "speaker notes"];

export function DeckIsCodeSlide({ step }: SlideProps) {
  const allowance = useMotionAllowance();

  return (
    <div className="flex h-full flex-col px-32 pt-24">
      <h2 className="text-[80px] leading-none font-bold tracking-tight">
        If you can build it, it&apos;s a slide.
      </h2>
      <p className="mt-6 text-[30px] text-theme-neutral">
        Any React, SVG or motion the agent can write: typed, diffable, reviewable.
      </p>

      <div className="mt-16 grid grid-cols-[760px_1fr] items-start gap-20">
        <pre className="rounded-3xl bg-theme-accent1 py-10 font-mono text-[30px] leading-[1.9] shadow-2xl ring-2 ring-theme-accent4">
          {code.map((line) => {
            const focused = line.focus === step;
            return (
              <div key={line.key ?? line.value} className="relative px-10">
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 bg-theme-accent3/20"
                  initial={false}
                  animate={{ opacity: focused ? 1 : 0 }}
                  transition={stepTransition(allowance, 0.35)}
                />
                <motion.span
                  className="relative"
                  initial={false}
                  animate={{ opacity: line.focus === null || line.focus <= step ? 1 : 0.35 }}
                  transition={stepTransition(allowance, 0.35)}
                >
                  {line.indent && "  "}
                  {line.key && <span className="text-theme-data2">{line.key}: </span>}
                  <span className={line.key ? "text-theme-accent5" : "text-theme-primary"}>
                    {line.value}
                  </span>
                </motion.span>
              </div>
            );
          })}
        </pre>

        <div>
          <div
            aria-hidden="true"
            className="flex aspect-video w-full flex-col rounded-2xl bg-theme-accent5 p-12 text-theme-on-primary shadow-2xl"
          >
            <p className="text-[56px] leading-none font-bold">The pitch</p>
            <div className="mt-10 grid flex-1 grid-cols-3 gap-6">
              {["bg-theme-accent2", "bg-theme-accent3", "bg-theme-accent4"].map((color, index) => (
                <motion.div
                  key={color}
                  className={`rounded-xl ${color}`}
                  initial={false}
                  animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 30 }}
                  transition={stepTransition(allowance, 0.45, step >= 2 ? index * 0.12 : 0)}
                />
              ))}
            </div>
          </div>

          <motion.div
            className="mt-8 flex items-center gap-6 rounded-2xl bg-theme-accent1 px-8 py-6 ring-2 ring-theme-data2"
            initial={false}
            animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 20 }}
            transition={stepTransition(allowance, 0.45)}
          >
            <Lock aria-hidden="true" className="size-10 shrink-0 text-theme-data2" />
            <p className="text-[26px] leading-snug">
              <span className="font-bold text-theme-data2">“Pause here.”</span>{" "}
              <span className="text-theme-accent5">
                Presenter window only — never on stage, never in the PDF.
              </span>
            </p>
          </motion.div>
        </div>
      </div>

      <ol className="mt-auto mb-14 flex gap-6 text-[24px]">
        {legend.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-6 py-2 font-bold ${
              index + 1 === step ? "bg-theme-accent2 text-theme-on-primary" : "text-theme-neutral"
            }`}
          >
            {index + 1} · {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
