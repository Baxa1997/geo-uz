// The pictures a shared link shows (Telegram, WhatsApp, Facebook, X): 1200×630, one per language, written to
// public/og/<locale>.jpg from the landing page's own texts (src/messages), drawn by Chrome with the site's fonts.
// The layout's metadata points at them (app/[locale]/layout.tsx). Draw them again after changing the hero's
// headline, the free check's button or the assistants asked, from frontend/:
//   node scripts/share-images.mjs [path to Chrome]
// Made on 23 Nov 2026, when the site went public at its own domain: a link in Telegram showed no picture.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.argv[2] || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOCALES = ["uz", "ru", "en"];
// The assistants a check asks (`ANSWER_ENGINES` on the server)
const ENGINES = ["ChatGPT", "Gemini"];
const ADDRESS = "seenovai.com";
// The mark's two rounds, as shared/components/logo.tsx draws them
const ROUNDS = [
  { cx: 22.5, cy: 8.2, r: 5.2 },
  { cx: 12.2, cy: 21.4, r: 9.6 },
];
const mark = (attributes) => `<svg viewBox="0.95 2.8 28.4 28.4" ${attributes}>${ROUNDS.map(({ cx, cy, r }) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join("")}</svg>`;
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(locale) {
  const { Landing } = JSON.parse(readFileSync(`src/messages/${locale}.json`, "utf8"));
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@500;600;700&family=Source+Serif+4:ital,opsz,wght@1,8..60,400&display=block">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { position: relative; font-family: Onest, sans-serif; color: #fff; -webkit-font-smoothing: antialiased;
    /* The login panel's navy gradient (features/auth/components/auth-panel.tsx) */
    background: linear-gradient(155deg, #0b1335 0%, #1c2e6e 52%, #3f63c8 100%); }
  .rounds { position: absolute; right: -150px; bottom: -200px; width: 720px; height: 720px; fill: #fff; fill-opacity: 0.07; }
  .frame { position: absolute; inset: 0; padding: 60px 72px 64px; display: flex; flex-direction: column; justify-content: space-between; }
  .row { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 36px; font-weight: 600; letter-spacing: -0.035em; }
  .brand svg { width: 46px; height: 46px; fill: #fff; }
  .engines { display: flex; gap: 12px; }
  .engine { padding: 9px 20px; border-radius: 999px; border: 1.5px solid rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.08);
    font-size: 24px; font-weight: 600; letter-spacing: -0.01em; }
  h1 { margin: 0; max-width: 1000px; font-size: 82px; line-height: 1.04; font-weight: 700; letter-spacing: -0.04em; text-wrap: balance; }
  /* The hero's last words: the serif italic, light on navy */
  h1 span { display: block; font-family: "Source Serif 4", serif; font-style: italic; font-weight: 400; letter-spacing: -0.02em; color: #c9d6ff; }
  .action { display: flex; align-items: center; gap: 22px; }
  .button { padding: 18px 34px; border-radius: 14px; background: #fff; color: #1c2e6e; font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
  .note { font-size: 26px; font-weight: 500; color: rgba(255, 255, 255, 0.78); }
  .address { font-size: 28px; font-weight: 600; letter-spacing: -0.01em; color: rgba(255, 255, 255, 0.92); }
</style></head>
<body>
  ${mark('class="rounds" aria-hidden="true"')}
  <div class="frame">
    <div class="row">
      <div class="brand">${mark('aria-hidden="true"')}Seenova AI</div>
      <div class="engines">${ENGINES.map((engine) => `<span class="engine">${engine}</span>`).join("")}</div>
    </div>
    <h1>${escape(Landing.hero.title)} <span>${escape(Landing.hero.titleMuted)}</span></h1>
    <div class="row">
      <div class="action"><span class="button">${escape(Landing.submit)} →</span><span class="note">${escape(Landing.cta.eyebrow)}</span></div>
      <span class="address">${ADDRESS}</span>
    </div>
  </div>
</body></html>`;
}

const folder = mkdtempSync(join(tmpdir(), "share-images-"));
mkdirSync("public/og", { recursive: true });
try {
  for (const locale of LOCALES) {
    const page = join(folder, `${locale}.html`);
    const picture = join(folder, `${locale}.png`);
    writeFileSync(page, html(locale));
    // Time for the fonts to arrive before the picture is taken
    execFileSync(CHROME, ["--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630", "--virtual-time-budget=10000", `--screenshot=${picture}`, `file://${page}`], { stdio: "ignore" });
    // A JPEG: the gradient makes a PNG several times larger
    const target = `public/og/${locale}.jpg`;
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", picture, "--out", target], { stdio: "ignore" });
    console.log(`${target}: ${Math.round(statSync(target).size / 1024)} KB`);
  }
} finally {
  rmSync(folder, { recursive: true, force: true });
}
