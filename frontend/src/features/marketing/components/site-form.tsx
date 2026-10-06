"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { Button } from "@/shared/components/ui/button";
import { FieldError } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { getPathname, useRouter } from "@/i18n/navigation";
import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import { useInView } from "@/shared/hooks/use-in-view";
import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";

const NO_EXAMPLES: string[] = [];

/** Typing speed of the example addresses, and the pauses around them, in ms. */
const TYPE_MS = 80;
const ERASE_MS = 35;
const HOLD_MS = 1700;
const NEXT_MS = 400;

/**
 * Types the examples into the field's placeholder one after another, erasing each before the next, and
 * puts `fallback` back when it stops. It writes to the input itself: a dozen letters a second through
 * React state would re-render the whole form for each one, for as long as the field is on screen.
 */
function useTypedPlaceholder(input: RefObject<HTMLInputElement | null>, examples: string[], fallback: string, playing: boolean) {
  useEffect(() => {
    const field = input.current;
    if (!playing || !field || examples.length === 0) return;
    let example = 0;
    let length = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const word = examples[example % examples.length] ?? "";
      length += erasing ? -1 : 1;
      field.placeholder = word.slice(0, length);
      if (!erasing && length === word.length) erasing = true;
      else if (erasing && length === 0) {
        erasing = false;
        example += 1;
      }
      const full = erasing && length === word.length;
      timer = setTimeout(step, full ? HOLD_MS : length === 0 ? NEXT_MS : erasing ? ERASE_MS : TYPE_MS);
    };
    timer = setTimeout(step, NEXT_MS);
    return () => {
      clearTimeout(timer);
      field.placeholder = fallback;
    };
  }, [input, examples, fallback, playing]);
}

/**
 * Website input that opens /check?site=…; also works as a plain GET form before JS loads.
 * With `examples`, the empty field types example addresses as its placeholder.
 */
export function SiteForm({
  defaultValue = "",
  initialError,
  examples,
}: {
  defaultValue?: string;
  initialError?: string;
  examples?: string[];
}) {
  const t = useTranslations("Landing");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [site, setSite] = useState(defaultValue);
  const [error, setError] = useState(initialError);
  const [focused, setFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inView = useInView(formRef);
  const reducedMotion = useReducedMotion();
  const placeholder = t("sitePlaceholder");
  useTypedPlaceholder(inputRef, examples ?? NO_EXAMPLES, placeholder, inView && !reducedMotion && !focused && site === "");

  function submit(event: FormEvent) {
    event.preventDefault();
    const domain = normalizeDomain(site);
    if (!isValidDomain(domain)) {
      setError(t("siteInvalid"));
      inputRef.current?.focus();
      return;
    }
    router.push(`/check?site=${encodeURIComponent(domain)}`);
  }

  return (
    <form
      ref={formRef}
      action={getPathname({ href: "/check", locale })}
      method="get"
      onSubmit={submit}
      noValidate
      className="flex w-full flex-col gap-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-site`} className="sr-only">
          {t("siteLabel")}
        </label>
        <Input
          ref={inputRef}
          id={`${id}-site`}
          name="site"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="url"
          className="h-12 bg-background px-3.5 text-base sm:flex-1 md:text-base"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <Button type="submit" variant="brand" size="lg" className="h-12 px-5 text-base">
          {t("submit")}
        </Button>
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </form>
  );
}
