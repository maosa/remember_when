import type { Metadata } from "next";
import { Lora, DM_Sans } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "fallback",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "fallback",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rememberwhen.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Remember When",
  description: "A shared memory book for the moments that matter.",
  openGraph: {
    title: "Remember When",
    description: "A shared memory book for the moments that matter.",
    url: "/",
    siteName: "Remember When",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Remember When",
    description: "A shared memory book for the moments that matter.",
  },
};

// Pre-paint theme script. A constant string (no cookies()/headers() on the
// server), so it's identical in every prerendered page and this layout stays
// static. It reads the JS-readable `rw_theme` cookie (see THEME_COOKIE in
// lib/themes.ts) and applies the palette before first paint on EVERY page,
// including static public ones — so a returning user sees their theme
// everywhere, while a visitor with no cookie gets the default. An unknown slug
// simply matches no [data-theme] CSS block and falls back to default; the regex
// guard keeps the assigned value to a safe [a-z-] slug.
const THEME_INIT_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )rw_theme=([a-z-]+)/);if(m&&m[1]&&m[1]!=='default')document.documentElement.dataset.theme=m[1];}catch(e){}`;

// Intentionally NOT async and reads no cookies/headers, so this layout — and
// therefore every public page under it — can be statically prerendered. The
// palette is applied client-side by the pre-paint script above (from the
// cookie), plus <ThemeSync> inside the (app) layout (from the DB source of
// truth), without forcing the app to be server-rendered on demand.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the pre-paint script sets data-theme on <html>
    // before hydration, which intentionally differs from this (theme-less,
    // static) server render. Scoped to <html> only.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${lora.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
