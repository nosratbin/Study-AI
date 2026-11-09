import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { Logo } from "@/components/ui";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div className="space-y-2">
            <Logo />
            <p className="text-sm text-muted">Learn, Innovate, Grow &amp; Thrive.</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold">Platform</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/programs" className="hover:text-ink">Programs</Link></li>
              <li><Link href="/levels" className="hover:text-ink">Learning levels</Link></li>
              <li><Link href="/opportunities" className="hover:text-ink">Opportunities</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold">Project</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/about" className="hover:text-ink">About</Link></li>
              <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-line py-4 text-center text-xs text-muted">
          Built for the AI Builders Congress, Daffodil International University · MVP
        </p>
      </footer>
    </>
  );
}
