"use client";

import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { downloadCsv, type CsvCell } from "@/shared/helpers/csv";
import { cn } from "@/shared/helpers/utils";

/** "Export" for a table on screen: the rows are worked out when clicked. */
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
  return (
    <Button
      type="button"
      variant="outline"
      title={hint}
      onClick={() => downloadCsv(filename, rows())}
      className={cn("h-8 bg-background", className)}
    >
      <Download aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  );
}
