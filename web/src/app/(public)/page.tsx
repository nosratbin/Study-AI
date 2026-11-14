import type { CSSProperties } from "react";
import { ArrowRight, BadgeCheck, KeyRound, Languages, ScrollText, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Sky } from "@/components/home/sky";
import { LevelTutor } from "@/components/home/level-tutor";
import { KiteString } from "@/components/home/kite-string";
import { ModuleBoard } from "@/components/home/module-board";
import { Reveal } from "@/components/home/reveal";
import { FaqAccordion } from "@/components/vengeance/faq-accordion";
import TextAnimation from "@/components/vengeance/staggerText";

/*
 * Home page. A student's level is how high their kite flies: one string runs from Class 6 to the first scholarship,
 * and the tutor demo shows on the spot that it answers at your level, in your language. The sky and the swaying brand
 * kite are the page's one rich moment; everything below stays on quiet surfaces.
 */

const PROMISES = [
  { icon: ScrollText, title: "Scores come from answer keys", text: "We mark assessments against stored answer keys. The AI can explain your result but never sets it." },
  { icon: BadgeCheck, title: "Only verified opportunities", text: "Our team checks every scholarship, deadline and application link before students see it." },
  { icon: KeyRound, title: "MindCare stays yours", text: "We keep mood check-ins away from grades and dashboards, and encrypt your private notes." },
  { icon: ShieldCheck, title: "Safer defaults for under-18s", text: "Younger students get a private profile by default and a guardian acknowledgement at sign-up." },
  { icon: Languages, title: "Bangla or English, your level", text: "Ask in the language you think in. The tutor pitches its answer to your class." },
];

const STATS = [
  { value: 3, label: "learning levels", note: "School, college and university" },
  { value: 9, label: "modules, one account", note: "From tutor to career" },
  { value: 2, label: "languages", note: "বাংলা and English" },
  { value: 0, label: "unverified listings", note: "Students only see checked ones" },
];

const FAQ = [
  {
    question: "Who is IccheGhuri for?",
    answer: "Students in Bangladesh from Class 6 to university. You choose your level when you sign up, and lessons, assessments and the tutor follow it.",
  },
  { question: "Is it free?", answer: "Yes. Creating an account and learning is free." },
  { question: "Can I ask questions in Bangla?", answer: "Yes. Ask the AI Smart Tutor in Bangla or English and it answers in the same language, at your level." },
  {
    question: "Does the AI decide my test score?",
    answer: "No. Scores come only from the stored answer key for each question. The AI can explain what you got wrong and what to study next.",
  },
  {
    question: "How are scholarships and opportunities checked?",
    answer: "Our team verifies every listing, including its deadline and official link, before students see it. We never invent or guess them.",
  },
  {
    question: "Who can see my MindCare check-ins?",
    answer: "Only you, and a counsellor if you choose to involve one. Teachers, rankings and dashboards never read them.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------- Hero: the sky ---------- */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <Sky />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20 lg:pb-28">
          <div>
            <h1 className="text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
              <TextAnimation>Learn AI at</TextAnimation>{" "}
              <span className="text-brand-600">
                <TextAnimation delay={0.2}>your level</TextAnimation>
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted animate-rise [animation-delay:160ms]">
              Lessons, a tutor that answers in Bangla or English, and verified scholarships for Bangladeshi students from Class 6 to
              university.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-rise [animation-delay:230ms]">
              <ButtonLink href="/register" size="lg" className="active:scale-[0.97] transition-[background-color,transform]">
                Get started <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="#path" size="lg" variant="secondary" className="active:scale-[0.97] transition-[background-color,transform]">
                See the path
              </ButtonLink>
            </div>
          </div>

          <div className="relative">
            {/* The brand kite launches once, after the card lands, then tugs on its string: the page's one looping motion.
                Launch and sway sit on separate elements so the two transforms never fight. */}
            <div
              className="pointer-events-none absolute -top-12 -right-2 z-10 w-20 animate-kite-launch [animation-delay:380ms] sm:-top-14 sm:w-28 lg:-top-16 lg:-right-6 lg:w-32"
              aria-hidden
            >
              <div className="origin-bottom animate-sway" style={{ "--sway": "5deg", "--sway-duration": "4.8s" } as CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static brand vector */}
                <img src="/brand/iccheghuri-symbol.svg" alt="" width={256} height={256} className="h-auto w-full drop-shadow-[0_10px_16px_rgb(23_32_51/0.16)]" />
              </div>
            </div>
            <div className="animate-rise [animation-delay:200ms]">
              <LevelTutor />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Facts strip ---------- */}
      <section className="border-b border-line bg-card">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.label} className={`py-8 pr-4 ${i % 2 === 1 ? "pl-6 border-l border-line" : ""} lg:pl-6 lg:first:pl-0 ${i > 0 ? "lg:border-l lg:border-line" : ""} ${i > 1 ? "border-t border-line lg:border-t-0" : ""}`}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">{s.value}</span>
                <span className="mt-1 block font-medium">{s.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{s.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------- The string: Class 6 to opportunity ---------- */}
      <section id="path" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
        <div className="mb-14 max-w-2xl md:mx-auto md:text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">From Class 6 to your first scholarship</h2>
          <p className="mt-3 text-lg text-muted">Find your stage. Each one lists the modules you&apos;ll use most.</p>
        </div>
        <KiteString />
        <div className="mt-16 flex justify-center">
          <ButtonLink href="/levels" variant="secondary">
            Compare the levels <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>

      {/* ---------- Modules ---------- */}
      <section className="border-y border-line bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Nine modules, one account</h2>
            <ButtonLink href="/features" variant="ghost" className="self-start sm:self-auto">
              All features <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          <ModuleBoard />
        </div>
      </section>

      {/* ---------- Product rules, enforced in code ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="rounded-[24px] border border-line bg-card">
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Rules we built in</h2>
              <p className="mt-4 max-w-sm text-muted">We enforce each one in the code, so it holds on every screen, for every student.</p>
            </div>
            <Reveal selector="li">
              <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
                {PROMISES.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="border-t border-line pt-5">
                    <Icon className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
                    <h3 className="mt-3 font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.6fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Before you sign up</h2>
            <p className="mt-3 text-muted">
              Something else? <a href="/contact" className="font-medium text-ink underline decoration-brand-500 underline-offset-4">Contact us</a>
            </p>
          </div>
          <FaqAccordion items={FAQ} title="" className="max-w-none py-0" />
        </div>
      </section>

      {/* ---------- Close ---------- */}
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 lg:py-32">
          {/* The closing kite launches up from the lower left when the section scrolls in. */}
          <Reveal from={{ x: -24, y: 56, rotation: -16, scale: 0.92 }} duration={1.1}>
            <div className="mx-auto w-16 sm:w-20" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand vector */}
              <img src="/brand/iccheghuri-symbol.svg" alt="" width={256} height={256} className="h-auto w-full -rotate-6" />
            </div>
          </Reveal>
          <h2 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Pick your level and let the kite fly</h2>
          <p lang="bn" className="mt-3 text-lg text-muted">
            তোমার ঘুড়ি, তোমার আকাশ
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" size="lg" className="active:scale-[0.97] transition-[background-color,transform]">
              Get started <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="ghost">
              Log in
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
