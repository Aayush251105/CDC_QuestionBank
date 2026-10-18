import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { CopyGuard } from "@/components/CopyGuard";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Placement Question Bank · CDC, Shiv Nadar University",
  description:
    "Online assessment questions shared by SNU students, checked by the Career Development Centre.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <CopyGuard />
        {children}
      </body>
    </html>
  );
}
