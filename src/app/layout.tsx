import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "American Odyssey — The Game",
  description: "A dynamic, era-driven board game experience powered by live content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
