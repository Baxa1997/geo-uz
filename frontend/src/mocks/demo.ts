// The landing page's product preview: the Tashkent dental clinic's report.
// Unlike the rest of mocks/, this is also used with the real backend. It is
// sample data shown as an illustration, never a visitor's own results.
import { PROJECT, PROMPTS } from "./data";
import { buildReport, SEEDED_RUN } from "./report";

export const DEMO_REPORT = buildReport(PROJECT, PROMPTS, "week", SEEDED_RUN);
