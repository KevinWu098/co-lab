import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Background } from "@/components/co-lab/dashboard/background";
import { FoldReveal } from "@/components/co-lab/fold-reveal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="relative font-sans">
      {/* Fold — fixed behind everything, revealed when content scrolls away */}
      <FoldReveal />

      {/* Content — scrolls over the fold */}
      <div className="relative z-10 bg-white">
        {/* Hero — shader background (dark) */}
        <section className="dark relative flex h-svh">
          <Background />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_25%,rgba(0,0,0,0.95))]" />
          <div className="relative mt-auto mr-auto pb-10 pl-10 mix-blend-exclusion">
            <h1 className="text-[14rem] leading-none font-bold tracking-tighter text-white">
              Co:Lab
            </h1>
            <Link href="/dashboard" className="group ml-3 flex items-center gap-2">
              <p className="group-hover:text-primary text-5xl leading-none font-semibold text-white transition-colors">
                AI-Accelerated Scientific Discovery
              </p>
              <ArrowRight className="group-hover:text-primary h-10 w-10 text-white transition-colors" />
            </Link>
          </div>
        </section>

        {/* Problem Statement — light */}
        <section className="bg-background relative px-10 py-16">
          <p className="max-w-8xl text-foreground text-6xl leading-snug font-medium tracking-tight text-balance">
            <span className="text-primary font-semibold text-balance">Co:Lab</span> is an integrated
            agentic laboratory — unlocking the <span className="font-semibold">40%</span> of
            researcher time spent on manual tasks and redirecting it toward discovery that moves
            science forward.
          </p>
          <Separator className="mt-16 border-t-2" />
        </section>

        {/* Design, Execute, Iterate — light */}
        <section className="bg-background relative flex flex-col gap-8 px-10 pb-20 tracking-tighter">
          <div className="text-6xl font-semibold">
            <span>Built end-to-end</span>
          </div>

          <div className="grid w-full grid-cols-3 gap-16">
            <div className="border-border flex min-h-[400px] flex-col border p-8">
              <div className="border-border bg-muted/50 mb-auto flex aspect-video w-full items-center justify-center border">
                <span className="text-muted-foreground/50 text-sm tracking-widest uppercase">
                  Image placeholder
                </span>
              </div>
              <h2 className="text-foreground mt-6 text-4xl font-bold tracking-tighter">Design</h2>
              <p className="text-muted-foreground mt-1 text-lg leading-none">
                Craft experimental protocols with AI-guided precision and domain expertise.
              </p>
            </div>
            <div className="border-border flex min-h-[400px] flex-col border p-8">
              <div className="border-border bg-muted/50 mb-auto flex aspect-video w-full items-center justify-center border">
                <span className="text-muted-foreground/50 text-sm tracking-widest uppercase">
                  Image placeholder
                </span>
              </div>
              <h2 className="text-foreground mt-6 text-4xl font-bold tracking-tighter">Execute</h2>
              <p className="text-muted-foreground mt-1 text-lg leading-none">
                Run experiments with automated hardware orchestration across your lab.
              </p>
            </div>
            <div className="border-border flex min-h-[400px] flex-col border p-8">
              <div className="border-border bg-muted/50 mb-auto flex aspect-video w-full items-center justify-center border">
                <span className="text-muted-foreground/50 text-sm tracking-widest uppercase">
                  Image placeholder
                </span>
              </div>
              <h2 className="text-foreground mt-6 text-4xl font-bold tracking-tighter">Iterate</h2>
              <p className="text-muted-foreground mt-1 text-lg leading-none">
                Analyze results and refine hypotheses in real time, closing the loop.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Fold reveal — CTA */}
      <div className="relative flex h-[600px] flex-col items-center justify-center gap-6">
        <h2 className="text-foreground/90 text-8xl font-bold tracking-tighter">
          What will you discover?
        </h2>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">Try Demo</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="https://devpost.com" target="_blank" rel="noopener noreferrer">
              Devpost
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
