import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8" aria-label="IccheGhuri home">
        <Logo className="h-12" />
      </Link>
      <main className="w-full max-w-md animate-fade-up">{children}</main>
    </div>
  );
}
