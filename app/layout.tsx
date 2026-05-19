import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/portal/LocaleProvider";
import { portalMetadata } from "@/lib/portal-metadata";
import "./globals.css";

const rootMetadata = portalMetadata.en.root;

export const metadata: Metadata = {
  title: {
    default: rootMetadata.title,
    template: `%s | ${rootMetadata.title}`
  },
  description: rootMetadata.description,
  openGraph: {
    title: rootMetadata.title,
    description: rootMetadata.description,
    type: "website",
    locale: "en_US"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
