import type { Brand, Tone } from "./api";

export interface NamedBrand {
  brand: Brand;
  /** One tone per answer that named the brand, in sample order. */
  tones: Tone[];
}

/** The four numbers every tracked brand is compared on. */
export type Metric = "visibility" | "shareOfVoice" | "sentiment" | "position";

/** A tracked brand as it is drawn where all brands appear: its own color everywhere. */
export interface SeriesBrand {
  id: string;
  name: string;
  isYou: boolean;
  /** A CSS color, e.g. "var(--series-2)". */
  color: string;
}
