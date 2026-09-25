import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Meshly", template: "%s · Meshly" },
  description: "One workspace for multiple Google Drive storage accounts.",
  applicationName: "Meshly",
  icons: { icon: "/brand/meshly-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
