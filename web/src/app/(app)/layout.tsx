"use client";

import { Suspense } from "react";
import { AppShell, RequireAuth } from "@/components/layout/app-shell";
import { Spinner } from "@/components/ui";

// AppShell reads usePathname(), and pages read useParams()/useSearchParams(); with cacheComponents those
// suspend during prerendering for dynamic routes, so the whole authenticated area renders behind one boundary.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Spinner />}>
      <RequireAuth>
        <AppShell>{children}</AppShell>
      </RequireAuth>
    </Suspense>
  );
}
