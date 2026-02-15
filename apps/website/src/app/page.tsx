import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Background } from "@/components/co-lab/dashboard/background";
import { FoldReveal } from "@/components/co-lab/fold-reveal";
import { ImageLightbox } from "@/components/co-lab/image-lightbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="relative font-sans">
      {/* Fold — fixed behind everything, revealed when content scrolls away */}
      <FoldReveal />

      {/* Fold reveal — CTA */}
      {/* <div className="relative flex h-[600px] flex-col items-center justify-center gap-6">
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
      </div> */}
    </div>
  );
}
