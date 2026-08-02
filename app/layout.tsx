import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "ラストファイア",
  title: "ラストファイア ― 雪原拠点経営",
  description:
    "焚き火をかき立て、資源を集め、雪原の拠点を大きくしていく放置系の経営シミュレーションゲーム。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ラストファイア",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#070d18",
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
