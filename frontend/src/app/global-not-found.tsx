// 404 for URLs that match no route. The root layout lives under [locale],
// so this page renders its own <html> and has no locale: text is in all three languages.
import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "404",
};

export default function GlobalNotFound() {
  return (
    <html lang="uz" className={`${fontVariables} h-full antialiased`}>
      {/* Extensions like Grammarly add attributes to <body> before hydration */}
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col items-center justify-center gap-3 p-4 text-center"
      >
        <p className="text-5xl font-semibold">404</p>
        <p className="text-muted-foreground">
          Sahifa topilmadi · Страница не найдена · Page not found
        </p>
        <Link href="/" className="underline underline-offset-4">
          Bosh sahifa · Главная · Home
        </Link>
      </body>
    </html>
  );
}
