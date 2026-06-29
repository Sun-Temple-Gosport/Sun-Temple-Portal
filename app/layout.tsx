import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sun Temple Gosport | Luxury Tanning Salon",
  description:
    "Sun Temple Gosport - luxury tanning salon. Buy tanning minutes online, manage your account and track your remaining minutes.",
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