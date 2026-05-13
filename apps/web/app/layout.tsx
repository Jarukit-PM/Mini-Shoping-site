import type { Metadata } from "next";
import { Newsreader, Geist, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import { CartProvider } from "@/components/CartProvider";
import "./globals.css";

/* ------------------------------------------------------------------ */
/*  Font loading                                                        */
/*  Each font gets a CSS variable injected on <html> by Next/font.     */
/*  globals.css then references them via --sans / --serif / --mono.    */
/* ------------------------------------------------------------------ */

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MERIDIAN",
  description: "MERIDIAN mini shopping site — OOAD project",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${geist.variable} ${jetbrains.variable}`}
    >
      <body>
        <ToastProvider>
          <CartProvider>{children}</CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
