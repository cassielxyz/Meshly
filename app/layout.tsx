import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import { PublicSiteChrome } from "@/components/public/public-site-chrome";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-bodoni",
});

export const metadata: Metadata = {
  title: { default: "Meshly", template: "%s · Meshly" },
  description: "One workspace for multiple Google Drive storage accounts.",
  applicationName: "Meshly",
  icons: { icon: "/brand/meshly-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={bodoni.variable}>
      <body>
        {children}
        <PublicSiteChrome />
      </body>
    </html>
  );
}
