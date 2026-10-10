"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { DropZone } from "@/shared/components/drop-zone";
import { isSpreadsheet, LIST_FILE_TYPES, readList } from "../helpers/file";

/** A file read into its list of values. */
export interface ListFile {
  name: string;
  values: string[];
}

/**
 * A list file (questions or keywords) dropped or picked, read in the browser (`readList`): a CSV's first
 * column or a text file's lines. A spreadsheet in its own format, an empty file or one that can't be read
 * says so under the box.
 */
export function FileDrop({ file, onFile }: { file: ListFile | null; onFile: (file: ListFile | null) => void }) {
  const t = useTranslations("PromptImport");
  const [error, setError] = useState("");

  async function read(picked: File) {
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
      <DropZone
        accept={LIST_FILE_TYPES}
        fileName={file?.name ?? null}
        title={t.rich("drop", { pick: (chunks) => <span className="underline underline-offset-4">{chunks}</span> })}
        hint={t("types")}
        another={t("another")}
        onFile={(picked) => void read(picked)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
