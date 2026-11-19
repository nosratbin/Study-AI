import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

// Keep this page true to the code: if a feature starts collecting or sharing new data, update the matching section.
const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <ul>
          <li>
            <strong>Account:</strong> your name, email address and password. We store the password only as a secure hash, never as
            plain text. If you sign in with Google, we receive your name, email address and Google account ID.
          </li>
          <li>
            <strong>Learning profile:</strong> your education level, class or year, institution, district, birth year, preferred
            language, interests and goals.
          </li>
          <li>
            <strong>Learning activity:</strong> the lessons you complete, assessment answers and scores, projects, skills,
            certificates, saved opportunities and study tasks.
          </li>
          <li>
            <strong>AI tutor chats:</strong> the messages you send to the AI tutor and its replies.
          </li>
          <li>
            <strong>MindCare:</strong> mood check-ins, optional notes, and support requests you choose to send.
          </li>
          <li>
            <strong>Messages to us:</strong> what you write in the contact form.
          </li>
          <li>
            <strong>Technical data:</strong> sign-in cookies and basic server logs, such as the time of a request and error details,
            which we use to keep the service running and secure.
          </li>
        </ul>
        <p>We do not use advertising trackers, and we do not sell your data.</p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: (
      <ul>
        <li>To create your account, sign you in and keep it secure.</li>
        <li>To show content, projects and opportunities that match your level and interests.</li>
        <li>To score assessments against stored answer keys and to issue certificates.</li>
        <li>To answer your questions in the AI tutor.</li>
        <li>To send account emails, such as your verification code. We do not send marketing emails.</li>
        <li>To reply to messages and support requests.</li>
      </ul>
    ),
  },
  {
    id: "wellbeing",
    title: "Well-being data",
    body: (
      <>
        <p>
          MindCare notes and support requests are encrypted before we store them. Mood check-ins are kept separate from your
          academic records: they are never used for scores, recommendations or dashboards.
        </p>
        <p>
          IccheGhuri is not an emergency or medical service. If you are in danger, call <strong>999</strong>, Bangladesh&apos;s national
          emergency number.
        </p>
      </>
    ),
  },
  {
    id: "ai-tutor",
    title: "The AI tutor",
    body: (
      <>
        <p>
          To answer you, we send your message, recent messages from the same chat and relevant lesson text to an AI model provider.
          We use Groq, Google (Gemini) and Z.ai, and a message may go to any of them. These providers process the text to produce a
          reply.
        </p>
        <p>Please don&apos;t share passwords, phone numbers or other private details in tutor chats. You can delete a chat at any time.</p>
      </>
    ),
  },
  {
    id: "google",
    title: "Google sign-in and Google Workspace",
    body: (
      <>
        <p>
          Google sign-in is handled through Firebase Authentication. We use it only to confirm your email address and name.
        </p>
        <p>
          If you choose to connect Google Drive or Google Calendar, we ask for the narrowest access that works: Drive access only to
          files IccheGhuri creates (such as lesson notes saved to an &quot;IccheGhuri&quot; folder), and Calendar access only to a
          calendar IccheGhuri creates. We cannot see your other files, calendars or events. We store the access tokens encrypted, and
          you can disconnect at any time from the app or from your{" "}
          <a href="https://myaccount.google.com/permissions" rel="noopener noreferrer" target="_blank">
            Google account settings
          </a>
          .
        </p>
        <p>
          IccheGhuri&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener noreferrer" target="_blank">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not use Google user data for advertising, we do not sell it, and we do not
          use it to train AI models.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who can see your data",
    body: (
      <>
        <ul>
          <li>
            <strong>Our team</strong> sees what it needs to run the service, for example to answer a support request.
          </li>
          <li>
            <strong>Anyone with your link</strong> can see your skill passport if you choose to share it, and can check a certificate
            you share. You can stop sharing your passport at any time.
          </li>
          <li>
            <strong>Service providers</strong> who host and run IccheGhuri for us: our hosting and database providers, our email
            provider (for verification emails), Google Firebase (sign-in) and the AI providers named above. They may only use your
            data to provide their service to us.
          </li>
          <li>
            <strong>Authorities</strong>, if the law requires it.
          </li>
        </ul>
        <p>Some of these providers store data outside Bangladesh.</p>
      </>
    ),
  },
  {
    id: "minors",
    title: "Students under 18",
    body: (
      <p>
        Many of our students are under 18. We ask for a parent or guardian&apos;s consent before a minor can share their skill passport
        publicly, and we collect only what the service needs. If you are a parent or guardian and want to see, correct or delete your
        child&apos;s data, <Link href="/contact">contact us</Link>.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <p>
        We use cookies only to keep you signed in. Your browser&apos;s local storage keeps your light or dark theme choice and saves
        assessment answers in progress, so you don&apos;t lose them if the page reloads. We do not use advertising or analytics cookies.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <p>
        We keep your data while your account exists. You can delete tutor chats, mood check-ins, projects and study tasks yourself at
        any time. When you ask us to delete your account, we delete your personal data, except where the law requires us to keep
        something.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    body: (
      <p>
        You can see and change most of your data in your profile. To get a copy of your data, correct something or delete your
        account, <Link href="/contact">contact us</Link> and we will reply.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We use HTTPS, hashed passwords, encryption for sensitive data, and sign-in sessions you can end from every device at once. No
        system is perfectly secure, so please use a strong password that you don&apos;t use anywhere else.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        If we change this policy, we will update the date at the top and, for important changes, tell you in the app. Questions about
        privacy? <Link href="/contact">Contact the IccheGhuri team</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="19 November 2026"
      intro={<p>This policy explains what IccheGhuri collects when you use it, why, who can see it, and the choices you have.</p>}
      sections={SECTIONS}
    />
  );
}
