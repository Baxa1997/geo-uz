import type { CSSProperties, ReactNode } from "react";

/**
 * Our own icons, for the places a visitor sees most: the sidebar's pages, the metrics and the action goals.
 * Drawn on a 24 grid with a 1.5 line and round ends, to sit beside the Phosphor icons used everywhere else.
 * One motif runs through them: a filled dot is "you" (your name in an answer, your place in a list).
 * Sized and colored by the class, like every icon (24px without one).
 */
interface Props {
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

const icon = (name: string, children: ReactNode) => {
  function OwnIcon(props: Props) {
    return (
      <svg data-own-icon="" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        {children}
      </svg>
    );
  }
  OwnIcon.displayName = name;
  return OwnIcon;
};

const dot = (cx: number, cy: number, r = 1.6) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
const BUBBLE = "M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v7.5a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3.5V17h-2A2.5 2.5 0 0 1 3 14.5V7a2.5 2.5 0 0 1 2.5-2.5Z";

/** Overview: a framed chart whose last point is you. */
export const IconOverview = icon("IconOverview", <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 15 3.5-3.5 3 2L17 9.5" />{dot(17, 9.5)}</>);
/** Questions: a question in a speech bubble. */
export const IconQuestions = icon("IconQuestions", <><path d={BUBBLE} /><path d="M10 9a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.5" />{dot(12, 14.4, 0.9)}</>);
/** Answers: an answer's lines in a speech bubble. */
export const IconAnswers = icon("IconAnswers", <><path d={BUBBLE} /><path d="M7.5 9h9M7.5 12.5h5.5" /></>);
/** Competitors: a podium, with you over the middle step. */
export const IconCompetitors = icon("IconCompetitors", <><path d="M3 20h18M4.5 20v-5.5h5V20M9.5 20V10h5v10M14.5 20v-7.5h5V20" />{dot(12, 5.5)}</>);
/** Sources: the web the answers are drawn from. */
export const IconSources = icon("IconSources", <><circle cx="12" cy="12" r="8.75" /><path d="M3.25 12h17.5M12 3.25c3 3 3 14.5 0 17.5M12 3.25c-3 3-3 14.5 0 17.5" /></>);
/** Wrong facts: a statement crossed out. */
export const IconWrongFacts = icon("IconWrongFacts", <><path d={BUBBLE} /><path d="m9.75 8.5 4.5 4.5M14.25 8.5l-4.5 4.5" /></>);
/** Actions: a list of work, two done and one to do. */
export const IconActions = icon("IconActions", <><path d="m3.5 6.5 1.75 1.75L8.5 5M3.5 12.5l1.75 1.75L8.5 11M12 6.5h8.5M12 12.5h8.5M12 18.5h5.5" /><circle cx="6" cy="18.5" r="1.75" /></>);
/** Reports: a page with a heading rule and lines. */
export const IconReports = icon("IconReports", <><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8.5 13h7M8.5 16.5h4" /></>);
/** Settings: two sliders. */
export const IconSettings = icon("IconSettings", <><path d="M3.5 8h9M17.5 8h3M3.5 16h3M11.5 16h9" /><circle cx="15" cy="8" r="2.5" /><circle cx="9" cy="16" r="2.5" /></>);

/** How often you are named: a speech bubble with you in it. */
export const IconMentions = icon("IconMentions", <><path d={BUBBLE} />{dot(12, 10.75, 2)}</>);
/** Share of voice: your slice of the whole. */
export const IconVoiceShare = icon("IconVoiceShare", <><circle cx="12" cy="12" r="8.75" /><path d="M12 3.25V12l7.25 4.75" /></>);
/** Place: a ranked list, you on its second line. */
export const IconPlace = icon("IconPlace", <><path d="M9.5 6h11M9.5 12h8M9.5 18h5" /><circle cx="4.75" cy="6" r="1.5" />{dot(4.75, 12, 1.9)}<circle cx="4.75" cy="18" r="1.5" /></>);
/** Rating: how well an answer speaks of you. */
export const IconRating = icon("IconRating", <path d="m12 3.5 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85Z" />);

/** A page to write or rework. */
export const IconPage = icon("IconPage", <><path d="M12.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5" /><path d="m18.2 3.6 2.2 2.2-6.9 6.9-2.9.7.7-2.9ZM8.5 16.5h5" /></>);
/** A fix on the website itself. */
export const IconSiteFix = icon("IconSiteFix", <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 9h18M10 12.5l-2 2 2 2M14 12.5l2 2-2 2" /></>);
