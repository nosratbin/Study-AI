"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/** Puts .dark on <html>. Follows the OS setting until the visitor picks a theme; the choice is kept in localStorage. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
