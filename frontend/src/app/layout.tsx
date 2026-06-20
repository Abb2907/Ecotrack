import React from "react";
import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EcoTrack | Carbon Footprint Tracker & AI Reduction Advisor",
  description: "Secure, accessible, and performant application to track personal daily carbon emissions and get personalized AI-driven sustainability recommendations.",
  keywords: "sustainability, carbon footprint, carbon reduction, climate change, personal emissions tracking",
  authors: [{ name: "EcoTrack Team" }],
  icons: {
    icon: "/favicon.svg",
  },
};

/**
 * Root layout component for the EcoTrack application.
 *
 * Wraps all pages with the AuthProvider context, Navbar, Footer,
 * and applies global fonts (Outfit + Inter) and dark theme.
 *
 * @param props - Layout props.
 * @param props.children - Page content rendered within the layout.
 * @returns The root HTML structure with navigation and content area.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${outfit.variable} ${inter.variable}`}>
      <body className="flex flex-col min-h-screen bg-brand-dark text-brand-text antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
