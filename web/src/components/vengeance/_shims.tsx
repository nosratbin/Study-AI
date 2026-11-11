"use client";

/**
 * Local stand-ins for VengeanceUI docs-site imports (their logo and theme toggle),
 * so notch-navbar compiles here. IccheGhuri has no dark mode yet, so the toggle renders nothing.
 */

export function ThemeToggle() {
  return null;
}

export default function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M7 10.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
    </svg>
  );
}
