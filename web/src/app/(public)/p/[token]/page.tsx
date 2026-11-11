import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui";
import { PublicPassportView } from "@/components/passport/public-passport";

// Share links are private-by-obscurity: keep them out of search engines and don't leak the token via Referer.
export const metadata: Metadata = {
  title: "Skill Passport · IccheGhuri",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PublicPassportPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PublicPassportView />
    </Suspense>
  );
}
