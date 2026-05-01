import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multi-Station Météo",
  description: "Tableau de bord IoT — Stations météorologiques",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="fr">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
      <AuthProvider>{children}</AuthProvider>
      </body>
      </html>
  );
}