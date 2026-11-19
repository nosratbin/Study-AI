import { Suspense } from "react";
import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { FooterLinks } from "@/components/shell/footer-links";
import { Logo } from "@/components/ui";

const PLATFORM = [
  { href: "/programs", label: "Programs" },
  { href: "/levels", label: "Learning levels" },
  { href: "/features", label: "Features" },
  { href: "/opportunities", label: "Opportunities" },
];

const PROJECT = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* PublicNav reads usePathname(); dynamic public routes (/p/[token], /certificates/[code]) need a boundary to prerender. */}
      <Suspense fallback={<div className="h-16 border-b border-line bg-card" aria-hidden />}>
        <PublicNav />
      </Suspense>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-10 sm:grid-cols-[1.6fr_1fr_1fr] sm:px-6">
          <div className="max-w-xs">
            <Link href="/" aria-label="IccheGhuri home" className="inline-block rounded-lg">
              <Logo className="h-8" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              AI learning for every student in Bangladesh, from Class 6 to university.
            </p>
          </div>
          <FooterLinks title="Platform" links={PLATFORM} />
          <FooterLinks title="Project" links={PROJECT} />
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="border-t border-line py-6 text-sm text-muted">
            Our team checks every scholarship, deadline and application link before students see it
          </p>
        </div>
      </footer>
    </>
  );
}
