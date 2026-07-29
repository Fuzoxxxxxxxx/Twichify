import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Twichify",
  description: "Générez votre widget Spotify pour votre stream Twitch",
  keywords: ["Twitch", "Spotify", "Widget", "Overlay", "OBS", "Music", "Stream"],
  openGraph: {
    title: "Twichify",
    description: "Partagez votre musique Spotify en live sur Twitch avec un overlay ultra-rapide.",
    url: "https://twichify.vercel.app/",
    siteName: "Twichify",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}