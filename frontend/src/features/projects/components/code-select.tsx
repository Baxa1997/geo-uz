import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select";

/** Native select over translated codes (category, city). 16px text on phones so iOS doesn't zoom. */
export function CodeSelect({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <NativeSelect
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full [&_select]:h-10 [&_select]:text-base md:[&_select]:text-sm"
    >
      {Object.entries(options).map(([code, label]) => (
        <NativeSelectOption key={code} value={code}>
          {label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
