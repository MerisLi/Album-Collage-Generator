import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pixelify = localFont({
  src: "../public/fonts/PixelifySans-VariableFont_wght.ttf",
  variable: "--font-pixelify",
  weight: "400 700",
});

export const metadata: Metadata = {
  title: "Album Wall",
  description: "A personal music archive and album wallpaper generator.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixelify.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}