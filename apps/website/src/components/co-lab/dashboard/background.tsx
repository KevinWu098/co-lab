"use client";

import { ImageDithering } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

function Shader({ width, height }: { width: number; height: number }) {
  return (
    <ImageDithering
      className="absolute inset-0 -z-10 h-svh w-svw opacity-50 brightness-125"
      colorBack="#1a2550"
      colorFront="#ffffff"
      colorHighlight="#00d288"
      colorSteps={2}
      fit="cover"
      height={height}
      image="/background.png"
      inverted={false}
      originalColors={false}
      size={2}
      type="8x8"
      width={width}
    />
  );
}

export function Background() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const update = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 h-svh w-svw">
      {/** biome-ignore lint/performance/noImgElement: trust me bro */}
      <img
        // src="/background-dither-placeholder.png"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover blur-xs transition-opacity duration-500 ${
          size ? "opacity-0" : "opacity-100"
        }`}
        height={1117}
        src="/foobar.png"
        width={1728}
      />
      {size && <Shader height={size.h} width={size.w} />}
    </div>
  );
}
