import { EASE_OUT, Logo, useMotionAllowance } from "@core";
import { motion } from "motion/react";
import { ShowcaseCard } from "./ShowcaseCard";

const workflow = [
  { command: "/opp-explore", outcome: "Talk through your audience, story and look." },
  { command: "/opp-propose", outcome: "Get a plan for the slides to review — nothing built yet." },
  { command: "/opp-apply", outcome: "Your agent builds and checks the approved slides." },
  { command: "/opp-archive", outcome: "The result becomes your deck's source of truth." },
];

function WorkflowSteps() {
  return (
    <ol className="mt-5 flex flex-col gap-4">
      {workflow.map((step, index) => (
        <li key={step.command} className="flex items-center gap-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-theme-accent4 text-[22px] font-bold text-theme-accent3">
            {index + 1}
          </span>
          <code className="w-[280px] shrink-0 whitespace-nowrap rounded-xl bg-theme-accent1 px-5 py-2 font-mono text-[28px] font-bold text-theme-accent5">
            {step.command}
          </code>
          <span className="text-[26px] text-theme-primary">{step.outcome}</span>
        </li>
      ))}
    </ol>
  );
}

export function TitleSlide() {
  const { entrance } = useMotionAllowance();
  const rise = (delay: number) => ({
    initial: entrance ? { opacity: 0, y: 24 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE_OUT },
  });

  return (
    <div className="relative flex h-full items-center justify-between overflow-hidden px-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-[1100px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-theme-accent2) 30%, transparent) 0%, transparent 65%)",
        }}
      />

      <div className="relative w-[1000px]">
        <Logo animated className="h-[72px] text-theme-accent2" />

        <motion.p
          className="mt-12 text-[22px] font-bold tracking-[0.2em] text-theme-accent3 uppercase"
          {...rise(0.6)}
        >
          Starter deck
        </motion.p>
        <motion.h1
          className="mt-3 text-[80px] leading-[1.05] font-bold tracking-tight text-balance text-theme-accent5"
          {...rise(0.7)}
        >
          Your presentation starts here.
        </motion.h1>
        <motion.p className="mt-6 text-[30px] leading-snug text-theme-neutral" {...rise(0.8)}>
          This slide is a placeholder for your story. Your coding agent builds the slides; you
          approve every plan before anything changes.
        </motion.p>

        <motion.div className="mt-10" {...rise(0.95)}>
          <p className="text-[24px] font-bold text-theme-accent3">
            Ask your coding agent, in order:
          </p>
          <WorkflowSteps />
        </motion.div>

        <motion.p className="mt-10 text-[22px] leading-snug text-theme-neutral" {...rise(1.1)}>
          Your deck lives in <code className="font-mono text-theme-accent5">presentation/</code> —
          keep your commits there and upstream updates merge cleanly. Full guide:{" "}
          <code className="font-mono text-theme-accent5">docs/starting-your-deck.md</code>
        </motion.p>
      </div>

      <ShowcaseCard />
    </div>
  );
}
