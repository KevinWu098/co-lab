"use client";

import { HalftoneDots, ImageDithering } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

export function Background() {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });

    update();

    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  if (size.w === 0) return null;

  return (
    // <HalftoneDots
    //   width={size.w}
    //   height={size.h}
    //   image="/background.png"
    //   colorBack="#f2f1e8"
    //   colorFront="#2b2b2b"
    //   originalColors={false}
    //   type="classic"
    //   grid="hex"
    //   inverted={false}
    //   size={0.4}
    //   radius={1.21}
    //   contrast={0.69}
    //   grainMixer={0.2}
    //   grainOverlay={0.28}
    //   grainSize={0.47}
    //   fit="cover"
    //   className="absolute inset-0 -z-10 h-svh w-svw opacity-50"
    // />
    <ImageDithering
      width={size.w}
      height={size.h}
      image="/background.png"
      colorBack="#1a2550"
      colorFront="#ffffff"
      colorHighlight="#00d288"
      originalColors={false}
      inverted={false}
      type="8x8"
      size={2}
      colorSteps={2}
      fit="cover"
      className="absolute inset-0 -z-10 h-svh w-svw opacity-50 brightness-125"
    />
  );
}
