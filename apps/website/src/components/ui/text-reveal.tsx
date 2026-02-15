"use client";

import { type MotionValue, motion, useScroll, useTransform } from "motion/react";
import { type ComponentPropsWithoutRef, type FC, type ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

export interface TextRevealProps extends ComponentPropsWithoutRef<"div"> {
  children: string;
}

export const TextReveal: FC<TextRevealProps> = ({ children, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  if (typeof children !== "string") {
    throw new Error("TextReveal: children must be a string");
  }

  const words = children.split(" ");

  return (
    <div ref={containerRef} className={cn("relative z-0 h-[200vh]", className)}>
      <div
        className={
          "max-w-8xl sticky top-0 mx-auto flex h-fit items-center justify-center bg-transparent px-[1rem] py-[5rem]"
        }
      >
        <span
          className={
            "text-muted-foreground/30 flex flex-wrap justify-center p-5 text-center text-4xl font-bold md:p-8 md:text-5xl lg:p-10 lg:text-6xl xl:text-7xl"
          }
        >
          {words.map((word, i) => {
            const start = (i / words.length) * 0.9;
            const end = ((i + 1) / words.length) * 0.9;
            return (
              <Word key={i} progress={scrollYProgress} range={[start, end]}>
                {word}
              </Word>
            );
          })}
        </span>
      </div>
    </div>
  );
};

interface WordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative mx-1.5 lg:mx-2.5 xl:mx-3">
      <span className="absolute opacity-30">{children}</span>
      <motion.span style={{ opacity: opacity }} className={"text-foreground"}>
        {children}
      </motion.span>
    </span>
  );
};
