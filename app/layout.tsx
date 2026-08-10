import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TanSalonOS | Professional Tanning Salon Management Platform",
  description:
  
  "Professional tanning salon management platform for customer management, online bookings, memberships, payments and live sunbed control.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}