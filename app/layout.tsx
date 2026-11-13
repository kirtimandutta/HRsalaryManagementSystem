import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { AppShell } from "@/components/shell";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "ACME Corp Compensation",
    template: "%s · ACME Compensation",
  },
  description: "Salary directory, payroll analytics, and compensation questions for ACME Corp HR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
