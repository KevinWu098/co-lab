"use client";

import { ImageDithering } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

function FoldShader({ width, height }: { width: number; height: number }) {
  return (
    <ImageDithering
      className="absolute inset-0 h-full w-full"
      colorBack="#1a2550"
      colorFront="#ffffff"
      colorHighlight="#00d288"
      colorSteps={2}
      fit="cover"
      height={height}
      image="/fold.png"
      inverted={false}
      originalColors={false}
      size={2}
      type="8x8"
      width={width}
    />
  );
}

export function FoldReveal() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed right-0 bottom-0 left-0 z-0 h-[100vh] w-svw overflow-hidden opacity-50 brightness-125">
      {size && <FoldShader height={600} width={size.w} />}
    </div>
  );
}
