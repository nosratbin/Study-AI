"use client";

import Link from "next/link";
import { SharedLayoutBg } from "@/components/beui/shared-layout-bg";

/** One footer link column. Same hover pill as the top nav, so the two share one hover vocabulary. */
export function FooterLinks({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  const id = `footer-${title.toLowerCase()}`;
  return (
    <nav aria-labelledby={id}>
      <p id={id} className="text-sm font-medium text-ink">
        {title}
      </p>
      <SharedLayoutBg as="ul" inset={8} className="mt-3 w-fit gap-0.5" pillClassName="rounded-lg bg-muted-bg">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block py-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </SharedLayoutBg>
    </nav>
  );
}
