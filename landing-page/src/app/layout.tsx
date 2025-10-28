import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Genie - Transform Your Dreams Into Reality",
  description:
    "Transform your dreams into reality with AI-powered guidance, one day at a time. Your personal Genie companion that creates personalized daily plans to help you achieve your goals.",
  keywords: [
    "AI",
    "personal development",
    "goal setting",
    "daily planning",
    "productivity",
    "self-improvement",
    "Genie",
  ],
  authors: [{ name: "Genie Team" }],
  creator: "Genie",
  publisher: "Genie",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/LogoSymbol.webp", type: "image/webp" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/LogoSymbol.webp", type: "image/webp" },
    shortcut: "/LogoSymbol.webp",
  },
  metadataBase: new URL("https://genie.app"),
  openGraph: {
    title: "Genie - Transform Your Dreams Into Reality",
    description:
      "Transform your dreams into reality with AI-powered guidance, one day at a time.",
    url: "https://genie.app",
    siteName: "Genie",
    images: [
      {
        url: "/LogoSymbol.webp",
        width: 1200,
        height: 630,
        alt: "Genie Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genie - Transform Your Dreams Into Reality",
    description:
      "Transform your dreams into reality with AI-powered guidance, one day at a time.",
    images: ["/LogoSymbol.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  themeColor: "#FFFF68",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-genie-background-primary text-white`}
      >
        {children}
      </body>
    </html>
  );
}
