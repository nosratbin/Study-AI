import { Alert, PageHeader } from "@/components/ui";
import { ApiError } from "@/lib/api";

/** True when the backend refused a teacher route because the account is not verified yet (403 `teacher_not_verified`). */
export function isNotVerified(e: unknown) {
  return e instanceof ApiError && e.code === "teacher_not_verified";
}

/** Shown instead of a Retry button: retrying cannot succeed until an admin verifies the account. */
export function NotVerifiedNotice({ title }: { title: string }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={title} />
      <Alert tone="info">
        An admin needs to verify your teacher account first. Until then you can&apos;t see student records, author courses or review projects. You&apos;ll get a
        notification once you&apos;re verified.
      </Alert>
    </div>
  );
}
