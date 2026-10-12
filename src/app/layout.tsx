import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shell/ThemeProvider";

export const metadata: Metadata = {
  title: "Ticksy",
  description: "Team issue tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
