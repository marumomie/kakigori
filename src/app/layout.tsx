import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "かき氷予約",
  description: "完全予約制かき氷屋の予約システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
