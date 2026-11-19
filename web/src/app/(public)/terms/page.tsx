import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of service" };

const SECTIONS: LegalSection[] = [
  {
    id: "using",
    title: "Using IccheGhuri",
    body: (
      <>
        <p>
          IccheGhuri is a learning platform for students in Bangladesh, from Class 6 to university. By creating an account or using the
          service, you agree to these terms and to our <Link href="/privacy">privacy policy</Link>.
        </p>
        <p>
          If you are under 18, a parent or guardian should read these terms with you. Some features, such as sharing your skill
          passport publicly, need their consent.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <ul>
        <li>Give your real name and an email address you can use. One account per person.</li>
        <li>Keep your password private. You are responsible for what happens in your account.</li>
        <li>If you think someone else has used your account, change your password and sign out of every device from your settings.</li>
      </ul>
    ),
  },
  {
    id: "conduct",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Harass, threaten or bully anyone, or post hateful, sexual or violent content.</li>
          <li>Cheat on assessments, or share answer keys or other people&apos;s work as your own.</li>
          <li>Try to break into accounts or systems, overload the service, or scrape it automatically.</li>
          <li>Use the AI tutor to produce harmful content or to get around its safety rules.</li>
          <li>Break the law or anyone else&apos;s rights.</li>
        </ul>
        <p>We may remove content or suspend accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: "ai",
    title: "The AI tutor",
    body: (
      <>
        <p>
          The AI tutor can explain, give examples and make practice questions, but it can be wrong. Check important facts against your
          lessons, textbooks or teachers. Practice quizzes from the tutor are not graded. Official assessment scores come only from our
          stored answer keys, never from the AI.
        </p>
        <p>The tutor is not a doctor, counsellor or lawyer, and its answers are not professional advice.</p>
      </>
    ),
  },
  {
    id: "opportunities",
    title: "Opportunities and certificates",
    body: (
      <>
        <p>
          Our team checks every scholarship, competition and programme we list against its official source. Details such as deadlines
          and eligibility can still change, so always confirm on the official page before you apply. We are not the organiser of these
          opportunities and cannot promise any result.
        </p>
        <p>
          Certificates show that you completed a course on IccheGhuri. They are not a degree or an official qualification from a school,
          board or university.
        </p>
      </>
    ),
  },
  {
    id: "wellbeing",
    title: "MindCare",
    body: (
      <p>
        MindCare offers well-being check-ins and ways to reach support. It is not a medical, counselling or emergency service. If you or
        someone else is in danger, call <strong>999</strong>.
      </p>
    ),
  },
  {
    id: "content",
    title: "Content and ownership",
    body: (
      <>
        <p>
          Lessons, assessments and other material on IccheGhuri belong to IccheGhuri or its partners. You may use them for your own
          learning, but not copy or sell them.
        </p>
        <p>
          Projects, notes and other work you create stay yours. You give us permission to store and show them so the service works, for
          example on your skill passport when you choose to share it.
        </p>
        <p>
          The digital library links to resources on other websites. Those sites have their own terms, and we are not responsible for
          them.
        </p>
      </>
    ),
  },
  {
    id: "google",
    title: "Google services",
    body: (
      <p>
        If you connect Google Drive or Google Calendar, IccheGhuri saves notes and study sessions there for you. Google&apos;s own terms
        apply to those services. You can disconnect at any time.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    body: (
      <p>
        IccheGhuri is free to start and is still growing. Features may change, and the service may sometimes be unavailable. We provide it
        &quot;as is&quot; and, as far as the law allows, we are not liable for indirect losses from using it.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Closing your account",
    body: (
      <p>
        You can stop using IccheGhuri at any time and ask us to delete your account through the <Link href="/contact">contact page</Link>.
        We may suspend or close accounts that seriously or repeatedly break these terms.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        If we change these terms, we will update the date at the top and, for important changes, tell you in the app. These terms are
        governed by the laws of Bangladesh. Questions? <Link href="/contact">Contact the IccheGhuri team</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="19 November 2026"
      intro={<p>These terms are the rules for using IccheGhuri. We have kept them short and in plain language.</p>}
      sections={SECTIONS}
    />
  );
}
