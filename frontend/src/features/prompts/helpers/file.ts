/** Files a list of questions or keywords can come in: a spreadsheet saved as CSV, or plain text. */
export const LIST_FILE_TYPES = ".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values";

/** A first row that names the column instead of holding a value: Search Console's "Top queries" and the like. */
const HEADER = /^(top queries|queries|query|keywords?|search terms?|prompts?|questions?|savol(lar)?|kalit so[ʻ'`]?z(lar)?|вопрос(ы)?|запрос(ы)?|ключев\S* слов\S*)$/i;

/** The first cell of a delimited line; a quoted cell may hold the separator and doubled quotes. */
function firstCell(line: string, separator: string): string {
  if (!line.startsWith('"')) return line.split(separator)[0] ?? "";
  let cell = "";
  for (let index = 1; index < line.length; index++) {
    const char = line.charAt(index);
    if (char === '"' && line.charAt(index + 1) === '"') {
      cell += '"';
      index++;
    } else if (char === '"') {
      break;
    } else {
      cell += char;
    }
  }
  return cell;
}

/** The separator a delimited file uses: whichever of tab, semicolon and comma its first line has most of. */
function separatorOf(line: string): string {
  const [best] = ["\t", ";", ","].map((separator) => ({ separator, count: line.split(separator).length - 1 })).sort((a, b) => b.count - a.count);
  return best && best.count > 0 ? best.separator : ",";
}

/**
 * The values of a list file, one per row, as written: a CSV or TSV file gives its first column (an SEO
 * tool's export puts the keywords there), a text file every line whole (a question may hold a comma).
 * A byte-order mark, empty rows and a header row are dropped; repeats are left to the caller.
 */
export function readList(text: string, fileName: string): string[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const delimited = /\.(csv|tsv)$/i.test(fileName);
  const separator = delimited ? separatorOf(lines[0] ?? "") : "";
  const values = lines.map((line) => (delimited ? firstCell(line.trim(), separator) : line).trim()).filter(Boolean);
  if (values.length > 0 && HEADER.test(values[0] ?? "")) values.shift();
  return values;
}

/** A spreadsheet in its own format can't be read here: it has to be saved as CSV first. */
export const isSpreadsheet = (fileName: string) => /\.(xlsx?|ods|numbers)$/i.test(fileName);
