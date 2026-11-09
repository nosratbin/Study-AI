"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { homeFor, useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/levels", label: "Learning levels" },
  { href: "/features", label: "Features" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const cta = user ? (
    <ButtonLink href={homeFor(user)} size="sm">
      Go to dashboard
    </ButtonLink>
  ) : (
    <>
      <ButtonLink href="/login" variant="ghost" size="sm">
        Log in
      </ButtonLink>
      <ButtonLink href="/register" size="sm">
        Get started
      </ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="LEARN AI home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === l.href ? "text-brand-600" : "text-muted hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={clsx("hidden items-center gap-2 lg:flex", loading && "invisible")}>{cta}</div>
        <button
          className="grid size-10 place-items-center rounded-lg text-ink lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-line bg-white px-4 pb-4 lg:hidden">
          <ul className="py-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 text-[15px] font-medium text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 [&>*]:flex-1" onClick={() => setOpen(false)}>
            {cta}
          </div>
        </div>
      )}
    </header>
  );
}
