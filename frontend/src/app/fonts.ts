import { Geist, Geist_Mono } from "next/font/google";

// `subsets` only picks what gets preloaded: every subset keeps its @font-face and is
// fetched when a page uses it. Preload just Latin (it covers Uzbek ʻ and ʼ) so the
// fonts don't compete with the CSS on slow phones; Cyrillic loads on Russian pages.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Only small labels use the mono face: no preload, it swaps in when ready
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
