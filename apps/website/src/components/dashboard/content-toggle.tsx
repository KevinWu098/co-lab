"use client";

import { ImageIcon, ImageOffIcon } from "lucide-react";
import { useContentVisibility } from "@/components/dashboard/content-visibility";
import { Button } from "@/components/ui/button";

export function ContentToggle() {
  const { visible, toggle } = useContentVisibility();

  return (
    <Button
      aria-label={visible ? "Hide content" : "Show content"}
      className="size-7"
      onClick={toggle}
      size="icon"
      variant="ghost"
    >
      {visible ? (
        <ImageIcon className="size-4 text-muted-foreground" />
      ) : (
        <ImageOffIcon className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}
