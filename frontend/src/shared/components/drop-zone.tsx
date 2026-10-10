"use client";

import { FileText, Upload } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/shared/helpers/utils";

/**
 * Where a file is dropped or picked, as Peec's dashed box ("Drag and drop your file here, or click to
 * browse"). Once a file is chosen the box names it and offers another. Reading the file is the caller's:
 * a list of questions, keywords, or a page's text.
 */
export function DropZone({
  accept,
  fileName,
  title,
  hint,
  another,
  onFile,
}: {
  accept: string;
  /** The file chosen, if any. */
  fileName: string | null;
  /** The invitation, with the words that pick a file underlined. */
  title: React.ReactNode;
  /** Which files it takes. */
  hint: string;
  /** "Choose another file", under the chosen one's name. */
  another: string;
  onFile: (file: File) => void;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        dragging ? "border-foreground/40 bg-muted" : "border-border hover:bg-muted/40",
      )}
    >
      {fileName ? (
        <>
          <FileText aria-hidden className="size-5 text-muted-foreground" />
          <span className="font-medium break-all">{fileName}</span>
          <span className="text-muted-foreground">{another}</span>
        </>
      ) : (
        <>
          <Upload aria-hidden className="size-5 text-muted-foreground" />
          <span>{title}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </>
      )}
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // The same file again is read again
          event.target.value = "";
        }}
      />
    </label>
  );
}
