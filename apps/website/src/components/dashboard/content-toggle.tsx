"use client";

import { ImageIcon, ImageOffIcon } from "lucide-react";
import { useContentVisibility } from "@/components/dashboard/content-visibility";
import { Button } from "@/components/ui/button";

export function ContentToggle() {
  const { visible, toggle } = useContentVisibility();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={toggle}
      aria-label={visible ? "Hide content" : "Show content"}
    >
      {visible ? (
        <ImageIcon className="text-muted-foreground size-4" />
      ) : (
        <ImageOffIcon className="text-muted-foreground size-4" />
      )}
    </Button>
  );
}
