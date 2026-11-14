import { JetBrains_Mono, Onest } from "next/font/google";

// The app's text face: Onest, drawn with Cyrillic from the start, so Russian reads as well as Uzbek.
// `subsets` only picks what gets preloaded: every subset keeps its @font-face and is
// fetched when a page uses it. Preload just Latin (it covers Uzbek ʻ and ʼ) so the
// fonts don't compete with the CSS on slow phones; Cyrillic loads on Russian pages.
const sans = Onest({
  variable: "--font-sans-face",
  subsets: ["latin"],
});

// Only small labels use the mono face: no preload, it swaps in when ready
const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  preload: false,
});

export const fontVariables = `${sans.variable} ${mono.variable}`;
