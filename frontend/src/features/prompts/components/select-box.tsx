"use client";

/**
 * A row's checkbox, or the heading's "all" box, which shows a dash when some rows are picked. The click
 * stays on the box: the row around it opens the question.
 */
export function SelectBox({
  checked,
  mixed = false,
  label,
  onChange,
}: {
  checked: boolean;
  mixed?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(box) => {
        if (box) box.indeterminate = mixed;
      }}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      className="size-4 shrink-0 cursor-pointer rounded accent-you align-middle"
    />
  );
}
