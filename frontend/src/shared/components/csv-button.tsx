"use client";

import { Download } from "lucide-react";
import { Hint } from "@/shared/components/hint";
import { Button } from "@/shared/components/ui/button";
import { downloadCsv, type CsvCell } from "@/shared/helpers/csv";
import { cn } from "@/shared/helpers/utils";

/** "Export" for a table on screen: the rows are worked out when clicked. `hint` says on hover what the file holds. */
export function CsvButton({
  filename,
  rows,
  label,
  hint,
  className,
}: {
  filename: string;
  rows: () => CsvCell[][];
  label: string;
  hint?: string;
  className?: string;
}) {
  const button = (describedBy?: string) => (
    <Button
      type="button"
      variant="outline"
      aria-describedby={describedBy}
      onClick={() => downloadCsv(filename, rows())}
      className={cn("h-8 bg-background", className)}
    >
      <Download aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  );
  return hint ? <Hint text={hint}>{button}</Hint> : button();
}
