import { Source_Serif_4 } from "next/font/google";

// The accent of the landing page's headline: a few words in a serif italic inside a heavy sans line (the
// pilot report's serif). Loaded by the public pages alone, as the class `font-display`. Latin is preloaded,
// since the headline is the first thing the page paints; Cyrillic loads on Russian pages.
export const displaySerif = Source_Serif_4({
  variable: "--font-display-face",
  subsets: ["latin"],
  style: ["italic"],
});
