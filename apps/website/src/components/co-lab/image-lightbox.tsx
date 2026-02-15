"use client";

import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function ImageLightbox({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-full w-full cursor-zoom-in">
        {/* biome-ignore lint/performance/noImgElement: lightweight lightbox */}
        <img src={src} alt={alt} className={className} />
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-6 right-6 text-white/70 transition-colors hover:text-white"
          >
            <XIcon className="size-6" />
          </button>
          {/* biome-ignore lint/performance/noImgElement: lightweight lightbox */}
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </button>
      )}
    </>
  );
}
