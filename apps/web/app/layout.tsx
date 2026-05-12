import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HideOnAdmin } from "@/components/HideOnAdmin";
import { SiteHeader } from "@/components/SiteHeader";
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
  title: "Mini Shopping Site",
  description: "OOAD mini e-commerce — catalog, cart, and checkout (roadmap)",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <HideOnAdmin>
          <SiteHeader />
        </HideOnAdmin>
        {children}
      </body>
    </html>
  );
}
