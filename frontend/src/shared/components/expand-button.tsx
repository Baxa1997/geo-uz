"use client";

import { Maximize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";

/** What a card shows when it is opened large. */
export interface Expanded {
  /** The block itself, with everything in it. */
  content: React.ReactNode;
  /** What the numbers say, in a sentence or two. */
  takeaway?: React.ReactNode;
  /** How to read the block. */
  guide?: React.ReactNode;
}

// Downloaded on the first click, so pages that never open a card (the landing page's preview) stay
// free of the dialog library
const ExpandWindow = dynamic(() => import("./expand-window").then((module) => module.ExpandWindow), { ssr: false });

/** The ⤢ in a card's tools: opens the card in a large window. */
export function ExpandButton({ title, content, takeaway, guide }: Expanded & { title: React.ReactNode }) {
  const t = useTranslations("Common");
  const [open, setOpen] = useState(false);
  // Stays mounted once opened, so the window can fade out when it closes
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-haspopup="dialog"
        aria-label={t("expand")}
        title={t("expand")}
        onClick={() => {
          setOpened(true);
          setOpen(true);
        }}
      >
        <Maximize2 aria-hidden />
      </Button>
      {opened && (
        <ExpandWindow open={open} onOpenChange={setOpen} title={title} takeaway={takeaway} guide={guide}>
          {content}
        </ExpandWindow>
      )}
    </>
  );
}
