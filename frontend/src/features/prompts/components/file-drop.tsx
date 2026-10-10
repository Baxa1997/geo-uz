"use client";

import { FileText, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { cn } from "@/shared/helpers/utils";
import { isSpreadsheet, LIST_FILE_TYPES, readList } from "../helpers/file";

/** A file read into its list of values. */
export interface ListFile {
  name: string;
  values: string[];
}

/**
 * Where a list file is dropped or picked, as Peec's dashed box: "Drag and drop your file here, or click to
 * browse". The file is read in the browser (`readList`); a spreadsheet in its own format, an empty file or
 * one that can't be read says so in place. Once read, the box names the file and offers another.
 */
export function FileDrop({ file, onFile }: { file: ListFile | null; onFile: (file: ListFile | null) => void }) {
  const t = useTranslations("PromptImport");
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function read(picked: File | undefined) {
    if (!picked) return;
    setError("");
    if (isSpreadsheet(picked.name)) {
      setError(t("spreadsheet"));
      return;
    }
    try {
      const values = readList(await picked.text(), picked.name);
      if (values.length === 0) {
        setError(t("emptyFile"));
        return;
      }
      onFile({ name: picked.name, values });
    } catch {
      setError(t("unreadable"));
    }
  }

  return (
    <div className="flex flex-col gap-2">
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
          void read(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
          dragging ? "border-foreground/40 bg-muted" : "border-border hover:bg-muted/40",
        )}
      >
        {file ? (
          <>
            <FileText aria-hidden className="size-5 text-muted-foreground" />
            <span className="font-medium break-all">{file.name}</span>
            <span className="text-muted-foreground">{t("another")}</span>
          </>
        ) : (
          <>
            <Upload aria-hidden className="size-5 text-muted-foreground" />
            <span>{t.rich("drop", { pick: (chunks) => <span className="underline underline-offset-4">{chunks}</span> })}</span>
            <span className="text-xs text-muted-foreground">{t("types")}</span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept={LIST_FILE_TYPES}
          className="sr-only"
          onChange={(event) => {
            void read(event.target.files?.[0]);
            // The same file again is read again
            event.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
