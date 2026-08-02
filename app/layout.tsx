import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "ラーメン一直線",
  title: "ラーメン一直線 ― 放置ラーメン屋経営",
  description:
    "丼を運び、お客をさばき、店員を雇って店を広げるアーケードアイドル系の放置経営ゲーム。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ラーメン一直線",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#14100d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
