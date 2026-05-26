import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sri Krishna Mobiles - Bill Generator",
  description: "POS & Invoicing web app for Sri Krishna Mobiles, Narayanpet. Generate bills, track sales, and manage payments.",
  keywords: ["Sri Krishna Mobiles", "Bill Generator", "POS", "Invoicing", "Mobile Repair"],
  authors: [{ name: "Sri Krishna Mobiles" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Sri Krishna Mobiles Bill Generator",
    description: "Your trusted mobile service center billing solution",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
