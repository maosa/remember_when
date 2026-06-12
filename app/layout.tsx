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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
