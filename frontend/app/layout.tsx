import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";

export const metadata: Metadata = {
  title: "Porpoise — Volunteer Scheduling",
  description: "Find your porpoise. The nonprofit scheduling system that meets your volunteers where they are.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#f8f9fc]">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
