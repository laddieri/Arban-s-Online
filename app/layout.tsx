import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arban's Complete Method for Trumpet/Cornet",
  description: "Interactive e-book version of Arban's Complete Conservatory Method for Trumpet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
