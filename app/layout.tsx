import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "V Streamer Tools",
    template: "%s | V Streamer Tools"
  },
  description: "VTuber向けの活動支援ツールポータル。公開版ではSchedule Calendarを提供しています。",
  openGraph: {
    title: "V Streamer Tools",
    description: "VTuber向けの活動支援ツールポータル。公開版ではSchedule Calendarを提供しています。",
    type: "website",
    locale: "ja_JP"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
