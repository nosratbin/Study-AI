import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui";
import { CertificateCheckView } from "@/components/passport/public-passport";

export const metadata: Metadata = {
  title: "Verify a certificate · IccheGhuri",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function CertificatePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CertificateCheckView />
    </Suspense>
  );
}
