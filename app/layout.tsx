import type { Metadata } from "next";
import { Lora, DM_Sans } from "next/font/google";
import "./globals.css";
import { getServerUser } from "@/lib/supabase/server";
import { getLayoutProfile } from "@/lib/cached-queries";
import { DEFAULT_THEME } from "@/lib/themes";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the signed-in user's colour palette and apply it platform-wide via
  // data-theme on <html>. Server-rendered so there's no flash of the default
  // theme. Signed-out visitors fall back to the default (no attribute).
  const {
    data: { user },
  } = await getServerUser();
  const theme = user
    ? (await getLayoutProfile(user.id))?.theme ?? DEFAULT_THEME
    : DEFAULT_THEME;

  return (
    <html
      lang="en"
      data-theme={theme !== DEFAULT_THEME ? theme : undefined}
      className={`${lora.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
