import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { AuthSetup } from "@/components/auth-setup";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Shown Media Dashboard",
  description: "Social Watch + Post Tracker — monitor and track X/Twitter performance",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${spaceGrotesk.variable} antialiased overflow-x-hidden`}>
        <AuthSetup />
        {children}
      </body>
    </html>
  );
}
