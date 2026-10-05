import { PHONE_LOCAL_DIGITS, PHONE_PREFIX } from "@/shared/constants";

const COUNTRY_CODE = PHONE_PREFIX.slice(1);

/** "901234567" → "90 123 45 67"; a partly typed number is formatted as far as it goes. */
export function formatLocalNumber(digits: string) {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(" ");
}

/** "+998901234567" → "+998 90 123 45 67" */
export function formatPhone(phone: string) {
  return phone.startsWith(PHONE_PREFIX)
    ? `${PHONE_PREFIX} ${formatLocalNumber(phone.slice(PHONE_PREFIX.length))}`
    : phone;
}

/** The 9 digits after +998 from whatever was typed, pasted or autofilled: "+998 (90) 123-45-67" → "901234567". */
export function localDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  const local =
    digits.length >= COUNTRY_CODE.length + PHONE_LOCAL_DIGITS && digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits;
  return local.slice(0, PHONE_LOCAL_DIGITS);
}
