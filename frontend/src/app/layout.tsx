import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ContentLeads - AI-Powered Content Discovery",
  description: "Automatically curate high-quality content from RSS feeds and Reddit with AI-powered relevance scoring. Perfect for content creators and AI influencers looking for trending topics.",
  keywords: ["content creation", "AI", "content curation", "RSS feeds", "Reddit", "content discovery", "AI influencers", "trending topics"],
  authors: [{ name: "ContentLeads Team" }],
  creator: "ContentLeads",
  publisher: "ContentLeads",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://contentleads.com",
    title: "ContentLeads - AI-Powered Content Discovery",
    description: "Automatically curate high-quality content from RSS feeds and Reddit with AI-powered relevance scoring. Perfect for content creators and AI influencers looking for trending topics.",
    siteName: "ContentLeads",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContentLeads - AI-Powered Content Discovery",
    description: "Automatically curate high-quality content from RSS feeds and Reddit with AI-powered relevance scoring. Perfect for content creators and AI influencers looking for trending topics.",
    creator: "@contentleads",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
