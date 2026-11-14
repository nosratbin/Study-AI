import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bengali = Noto_Sans_Bengali({ variable: "--font-bengali", subsets: ["bengali"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "IccheGhuri — AI learning for every student in Bangladesh", template: "%s · IccheGhuri" },
  applicationName: "IccheGhuri",
  description:
    "Making quality AI education, personal development, and global opportunities accessible to every student in Bangladesh.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F97316" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the class on <html> before hydration, so React must not warn about the mismatch.
    <html lang="en" className={`${inter.variable} ${bengali.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
