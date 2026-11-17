"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Menu } from "lucide-react";
import { ButtonLink, Logo, buttonClass } from "@/components/ui";
import { SharedLayoutBg } from "@/components/beui/shared-layout-bg";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/vengeance/sheet";
import { homeFor, useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/levels", label: "Learning levels" },
  { href: "/features", label: "Features" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/contact", label: "Contact" },
];

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function PublicNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="IccheGhuri home" className="shrink-0 rounded-lg">
          <Logo className="h-8" />
        </Link>

        {/* Desktop links: one quiet pill glides to whichever link is hovered or focused. */}
        <SharedLayoutBg as="ul" inset={0} className="hidden w-auto flex-row items-center lg:flex" pillClassName="rounded-lg bg-muted-bg">
          {LINKS.map((l) => {
            const current = isCurrent(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={current ? "page" : undefined}
                  className={clsx(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                    current ? "text-brand-600" : "text-muted hover:text-ink",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </SharedLayoutBg>

        <div className="hidden items-center gap-1 lg:flex">
          <ThemeToggle />
          <span className="mx-2 h-5 w-px bg-line" aria-hidden />
          <div className={clsx("flex items-center gap-1", loading && "invisible")}>
            {user ? (
              <ButtonLink href={homeFor(user)} size="sm">
                Go to dashboard
              </ButtonLink>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">
                  Log in
                </Link>
                <ButtonLink href="/register" size="sm">
                  Get started
                </ButtonLink>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle className="size-10" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-lg text-ink transition-colors duration-150 hover:bg-surface"
                aria-label="Open menu"
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="gap-0 bg-card ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=closed]:duration-200 data-[state=open]:duration-300 lg:hidden"
            >
              <div className="border-b border-line px-5 py-3">
                <SheetTitle className="text-base leading-6 font-medium">Menu</SheetTitle>
                <SheetDescription className="sr-only">Pages on the IccheGhuri site</SheetDescription>
              </div>
              <nav aria-label="Menu" className="flex-1 overflow-y-auto px-3 py-3">
                <ul className="space-y-0.5">
                  {LINKS.map((l) => {
                    const current = isCurrent(pathname, l.href);
                    return (
                      <li key={l.href}>
                        <SheetClose asChild>
                          <Link
                            href={l.href}
                            aria-current={current ? "page" : undefined}
                            className={clsx(
                              "flex h-12 items-center rounded-lg px-3 text-[15px] font-medium transition-colors duration-150 active:bg-muted-bg",
                              current ? "text-brand-600" : "text-ink",
                            )}
                          >
                            {l.label}
                          </Link>
                        </SheetClose>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className={clsx("space-y-2 border-t border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]", loading && "invisible")}>
                {user ? (
                  <SheetClose asChild>
                    <Link href={homeFor(user)} className={buttonClass("primary", "md", "w-full")}>
                      Go to dashboard
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link href="/register" className={buttonClass("primary", "md", "w-full")}>
                        Get started
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/login" className="flex h-11 items-center justify-center rounded-xl text-sm font-medium text-ink transition-colors duration-150 active:bg-muted-bg">
                        Log in
                      </Link>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
