import { CONTACT_EMAIL } from "@/shared/constants";

export interface LegalSection {
  id: string;
  title: string;
  /** Paragraphs, separated by a blank line in the message. */
  body: string;
}

/** A text with our email address in it, the address a link that writes to us. */
function WithEmail({ text }: { text: string }) {
  const parts = text.split(CONTACT_EMAIL);
  return parts.map((part, index) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 && (
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground underline underline-offset-4 hover:text-brand">
          {CONTACT_EMAIL}
        </a>
      )}
    </span>
  ));
}

/**
 * The Terms of use and the Privacy policy (24 Nov 2026): one plain document in the public pages' look, its title,
 * date and opening, the sections listed as links, then each section numbered, and how to write to us.
 */
export function LegalDocument({
  label,
  title,
  updated,
  intro,
  contents,
  sections,
  questions,
}: {
  label: string;
  title: string;
  updated: string;
  intro: string;
  contents: string;
  sections: LegalSection[];
  questions: string;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-10 pb-20 sm:px-8 sm:pt-16">
      <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-balance sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{updated}</p>
      <p className="mt-6 text-lg/relaxed text-pretty">
        <WithEmail text={intro} />
      </p>

      <nav aria-labelledby="legal-contents" className="mt-8 rounded-lg border bg-card p-5">
        <h2 id="legal-contents" className="text-sm font-medium text-muted-foreground">
          {contents}
        </h2>
        <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline-offset-4 hover:underline">
                <span className="text-muted-foreground tabular-nums">{index + 1}.</span> {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section, index) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mt-10 scroll-mt-28">
          <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-tight text-balance">
            <span className="text-muted-foreground tabular-nums">{index + 1}.</span> {section.title}
          </h2>
          {section.body.split("\n\n").map((paragraph, number) => (
            <p key={number} className="mt-3 leading-relaxed text-pretty text-foreground/85">
              <WithEmail text={paragraph} />
            </p>
          ))}
        </section>
      ))}

      <p className="mt-14 border-t pt-6 text-sm text-muted-foreground">
        <WithEmail text={questions} />
      </p>
    </article>
  );
}
