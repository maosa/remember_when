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

// Intentionally NOT async and reads no cookies/headers, so this layout — and
// therefore every public page under it — can be statically prerendered. The
// signed-in user's colour palette is applied client-side from the (app) layout
// (its pre-paint <script>), which keeps data-theme on <html> without forcing
// the whole app to be server-rendered on demand.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the (app) layout's pre-paint script sets
    // data-theme on <html> before hydration, which intentionally differs from
    // this (theme-less, static) server render. Scoped to <html> only.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${lora.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
