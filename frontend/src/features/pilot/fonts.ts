import { Source_Serif_4 } from "next/font/google";

// The pilot report's headings. Loaded by the report's page alone: no other page pays for it.
export const pilotSerif = Source_Serif_4({
  variable: "--font-pilot-serif",
  subsets: ["latin", "cyrillic"],
  preload: false,
});
