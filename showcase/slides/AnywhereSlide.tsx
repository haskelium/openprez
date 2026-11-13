import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import { ArrowRight, FileCode2, FileDown, Monitor, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

const pageAngles = [-14, -5, 4, 13];

export function AnywhereSlide({ step }: SlideProps) {
  return (
    <div className="flex h-full flex-col px-32 pt-24">
      <h2 className="text-[80px] leading-none font-bold tracking-tight">
        One HTML file. Present anywhere. Hand it out.
      </h2>

      <div className="mt-20 grid flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-8">
        <Zone visible={step >= 1} caption="One file to send. No folder, no install.">
          <StandaloneFile />
        </Zone>
        <Arrow visible={step >= 2} />
        <Zone visible={step >= 2} caption="Open it locally. No Wi-Fi, no local server.">
          <OfflineProjector />
        </Zone>
        <Arrow visible={step >= 3} />
        <Zone visible={step >= 3} caption="Export the same deck as a landscape PDF handout.">
          <PdfFan visible={step >= 3} />
        </Zone>
      </div>
    </div>
  );
}

function Zone({
  visible,
  caption,
  children,
}: {
  visible: boolean;
  caption: string;
  children: ReactNode;
}) {
  const allowance = useMotionAllowance();
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 40 }}
      transition={stepTransition(allowance, 0.5)}
    >
      <div className="flex h-[440px] items-center justify-center rounded-3xl bg-theme-accent1 text-theme-accent5">
        {children}
      </div>
      <p className="mt-6 text-[26px] leading-snug text-theme-accent5">{caption}</p>
    </motion.div>
  );
}

function Arrow({ visible }: { visible: boolean }) {
  const allowance = useMotionAllowance();
  return (
    <motion.div
      className="flex h-[440px] items-center"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={stepTransition(allowance, 0.4)}
    >
      <ArrowRight aria-hidden="true" className="size-14 text-theme-data2" strokeWidth={2.5} />
    </motion.div>
  );
}

function StandaloneFile() {
  return (
    <div className="flex flex-col items-center">
      <FileCode2 aria-hidden="true" className="size-48 text-theme-primary" strokeWidth={1.25} />
      <code className="mt-6 rounded-2xl bg-theme-on-primary px-8 py-4 font-mono text-[38px] font-bold text-theme-primary">
        prez.html
      </code>
      <div className="mt-5 flex gap-3 font-mono text-[22px] font-bold text-theme-on-primary">
        <span className="rounded-full bg-theme-accent3 px-4 py-2">HTML</span>
        <span className="rounded-full bg-theme-data2 px-4 py-2">JS</span>
        <span className="rounded-full bg-theme-accent4 px-4 py-2">CSS</span>
      </div>
    </div>
  );
}

function OfflineProjector() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Monitor aria-hidden="true" className="size-48 text-theme-primary" strokeWidth={1.25} />
        <span className="absolute -right-6 -bottom-2 flex size-20 items-center justify-center rounded-full bg-theme-accent3">
          <WifiOff
            aria-label="offline"
            className="size-11 text-theme-on-primary"
            strokeWidth={2.5}
          />
        </span>
      </div>
      <p className="mt-8 text-[64px] leading-none font-bold">0</p>
      <p className="mt-2 text-[26px] text-theme-neutral">network requests</p>
    </div>
  );
}

function PdfFan({ visible }: { visible: boolean }) {
  const allowance = useMotionAllowance();
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[220px] w-[360px]">
        {pageAngles.map((angle, index) => (
          <motion.div
            key={angle}
            aria-hidden="true"
            className="absolute top-6 left-[60px] flex aspect-video w-[240px] origin-bottom flex-col rounded-md bg-theme-accent5 p-3 shadow-xl"
            initial={false}
            animate={{ rotate: visible ? angle : 0, opacity: visible ? 1 : 0 }}
            transition={stepTransition(allowance, 0.5, visible ? index * 0.1 : 0)}
          >
            <span className="h-3 w-2/3 rounded-sm bg-theme-on-primary" />
            <span className="mt-2 grid flex-1 grid-cols-3 gap-1.5">
              {[0, 1, 2].map((block) => (
                <span
                  key={block}
                  className={
                    block <= index - 1
                      ? [
                          "rounded-sm bg-theme-accent3",
                          "rounded-sm bg-theme-accent4",
                          "rounded-sm bg-theme-data2",
                        ][block]
                      : "rounded-sm bg-theme-accent2/20"
                  }
                />
              ))}
            </span>
            <span className="mt-1.5 h-1.5 rounded-full bg-theme-on-primary" />
          </motion.div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-3 text-[30px] font-bold">
        <FileDown aria-hidden="true" className="size-10 text-theme-primary" /> deck.pdf
      </p>
    </div>
  );
}
