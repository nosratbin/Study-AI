import type { ReactNode } from "react";
import {
  Bot,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  FlaskConical,
  HeartHandshake,
  Map,
  Medal,
  Trophy,
} from "lucide-react";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="border-b border-line bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-lg text-muted">{children}</div>}
      </div>
    </section>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-4 py-14 sm:px-6 ${className}`}>{children}</section>;
}

export const FEATURES = [
  { icon: Bot, title: "AI Smart Tutor", text: "Ask in Bangla or English. Explanations adapt to school, college or university level, step by step." },
  { icon: ClipboardCheck, title: "Skill Assessment", text: "Topic tests scored against verified answer keys, with strengths, gaps and a recommended level." },
  { icon: Map, title: "Personalised Roadmap", text: "Python → AI fundamentals → ML → Deep Learning → projects, with milestones and next lessons." },
  { icon: FlaskConical, title: "AI Project Lab", text: "Guided challenges and beginner AI projects using Google Colab, reviewed by mentors." },
  { icon: Trophy, title: "Opportunity Hub", text: "Scholarships, stipends, olympiads, hackathons and internships, each checked by our team before we list it." },
  { icon: HeartHandshake, title: "MindCare", text: "Private mood check-ins, mindfulness and healthy study habits, with paths to real human support." },
  { icon: Medal, title: "Skill Passport", text: "Courses, projects, awards and achievements in one profile you control and can share." },
  { icon: Briefcase, title: "Career Navigator", text: "Explore careers, soft skills, entrepreneurship, study abroad and financial literacy." },
  { icon: BookOpen, title: "Google Workspace", text: "Save notes to Drive, add deadlines to Calendar and practise Python in Colab." },
];

export function FeatureGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, text }) => (
        <div key={title} className="rounded-card border border-line bg-card p-6 shadow-card">
          <div className="mb-4 grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="size-5" aria-hidden />
          </div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
        </div>
      ))}
    </div>
  );
}
