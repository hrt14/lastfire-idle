import type { Metadata, Viewport } from "next";
import AquariumStageRegistry from "@/components/AquariumStageRegistry";
import ScrollMode from "@/components/ScrollMode";
import OceanTopLink from "@/components/OceanTopLink";
import "@/data/aquarium-balance-v2";
import "./globals.css";
import "./fx-toggle-fix.css";

export const metadata: Metadata = {
  applicationName: "ワーキングプラネット",
  title: "ワーキングプラネット ― 働いて大きくする放置ゲーム",
  description:
    "働いて街と星を大きくしていく放置ゲームのシリーズ。はんじょうダッシュ、世界水族館、SCRAP PLANET、OCEAN PLANETを遊べます。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ワーキングプラネット",
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
      <body>
        <AquariumStageRegistry>
          <ScrollMode />
          {children}
          <OceanTopLink />
        </AquariumStageRegistry>
      </body>
    </html>
  );
}
