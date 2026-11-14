"use client";

import { useRef } from "react";
import clsx from "clsx";
import { EASE_OUT, gsap, ScrollTrigger, useGSAP, withMotion } from "@/lib/gsap";

/**
 * The learning path drawn as one kite string, from Class 6 up to the first scholarship or internship.
 *
 * The string is a single SVG path traced through the knots' measured centres and re-traced whenever the layout moves.
 * Scroll drives one progress value; it is mapped segment by segment (knot to knot) onto the path's real length, so the
 * head of the string sits on the same line of the viewport the whole way and reaches each knot exactly when that knot
 * does. Knots light up from the same value, so the string and the knots can never disagree. Reduced motion: drawn in full.
 */

const STOPS = [
  {
    when: "Class 6-10",
    level: "Beginner",
    title: "Find out what AI is",
    text: "Logical thinking, first steps in coding, and a tutor that explains in simple Bangla or English.",
    modules: ["AI Smart Tutor", "Skill Assessment", "MindCare"],
  },
  {
    when: "HSC",
    level: "Intermediate",
    title: "Python, data and your first models",
    text: "A roadmap from Python to AI fundamentals, with mini projects you run yourself in Google Colab.",
    modules: ["Personalised Roadmap", "AI Project Lab", "Google Workspace"],
  },
  {
    when: "University",
    level: "Professional",
    title: "Machine learning you can show",
    text: "Deep learning and portfolio-grade projects reviewed by mentors, collected in a passport you can share.",
    modules: ["AI Project Lab", "Skill Passport", "Career Navigator"],
  },
  {
    when: "After that",
    level: "Opportunities",
    title: "Scholarships, olympiads, internships",
    text: "Only listings our team has verified, matched to your level and interests, with deadlines in your calendar.",
    modules: ["Opportunity Hub", "Skill Passport", "Google Calendar"],
  },
];

/** Where the head of the string sits in the viewport while you scroll (60% down from the top). */
const HEAD = "center 60%";

export function KiteString() {
  const root = useRef<HTMLDivElement>(null);
  const base = useRef<SVGPathElement>(null);
  const line = useRef<SVGPathElement>(null);
  const probe = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const knots = gsap.utils.toArray<HTMLElement>("[data-knot]", el);
      const n = knots.length;
      if (n < 2) return;

      let ys: number[] = []; // knot centre heights
      let lens: number[] = []; // path length from the first knot to each knot
      let total = 0;
      let progress = 0;

      const render = (p: number) => {
        progress = p;
        const y = ys[0] + p * (ys[n - 1] - ys[0]);
        let i = 0;
        while (i < n - 2 && y > ys[i + 1]) i++;
        const t = gsap.utils.clamp(0, 1, (y - ys[i]) / (ys[i + 1] - ys[i] || 1));
        const drawn = lens[i] + t * (lens[i + 1] - lens[i]);
        line.current!.style.strokeDashoffset = String(total - drawn);
        knots.forEach((k, j) => k.toggleAttribute("data-on", p > 0 && drawn >= lens[j] - 0.5));
      };

      // One S-curve per gap between knots, bowing left and right like a string in the wind.
      const trace = () => {
        const box = el.getBoundingClientRect();
        const pts = knots.map((k) => {
          const r = k.getBoundingClientRect();
          return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
        });
        const bow = window.matchMedia("(min-width: 768px)").matches ? 22 : 10;
        let d = `M${pts[0][0]} ${pts[0][1]}`;
        lens = [0];
        for (let i = 1; i < n; i++) {
          const [x0, y0] = pts[i - 1];
          const [x1, y1] = pts[i];
          const b = i % 2 ? bow : -bow;
          const dy = y1 - y0;
          d += ` C${x0 + b} ${y0 + dy * 0.35}, ${x1 - b} ${y1 - dy * 0.35}, ${x1} ${y1}`;
          probe.current!.setAttribute("d", d);
          lens.push(probe.current!.getTotalLength());
        }
        ys = pts.map((pt) => pt[1]);
        total = lens[n - 1];
        base.current!.setAttribute("d", d);
        line.current!.setAttribute("d", d);
        line.current!.style.strokeDasharray = `${total} ${total}`;
        render(progress);
      };

      trace();
      render(1); // reduced motion and no-JS-motion default: the whole string, every knot lit

      withMotion(() => {
        render(0);
        const state = { p: 0 };
        gsap.to(state, {
          p: 1,
          ease: "none",
          onUpdate: () => render(state.p),
          scrollTrigger: { trigger: knots[0], start: HEAD, endTrigger: knots[n - 1], end: HEAD, scrub: 0.3 },
        });
        gsap.utils.toArray<HTMLElement>("[data-card]", el).forEach((card) => {
          gsap.from(card, { autoAlpha: 0, y: 16, duration: 0.6, ease: EASE_OUT, scrollTrigger: { trigger: card, start: "top 85%", once: true } });
        });
        return () => render(1); // switched to reduced motion mid-visit: show the whole string again
      });

      // Anything that moves the layout (fonts, the hero settling, a resize) moves the knots: re-trace and re-measure.
      let frame = 0;
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          trace();
          ScrollTrigger.refresh();
        });
      });
      ro.observe(el);
      ro.observe(document.body);
      return () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative">
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
        <path ref={probe} fill="none" stroke="none" />
        <path ref={base} fill="none" className="stroke-line" strokeWidth="2" />
        <path ref={line} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <ol className="relative space-y-16 md:space-y-24">
        {STOPS.map((s, i) => {
          const right = i % 2 === 1;
          return (
            <li key={s.when} className={clsx("relative pl-12 md:w-1/2 md:pl-0", right ? "md:ml-auto md:pl-16" : "md:pr-16 md:text-right")}>
              {/* Knot on the string: grey until the string reaches it, then it fills orange. */}
              <span
                data-knot
                aria-hidden
                className={clsx(
                  "group absolute top-1 left-[13px] z-10 grid size-5 scale-[0.8] place-items-center rounded-full border-2 border-line bg-surface md:top-1.5",
                  "transition-[scale,border-color] duration-200 ease-out data-on:scale-100 data-on:border-brand-500",
                  right ? "md:left-0 md:-translate-x-1/2" : "md:left-auto md:right-0 md:translate-x-1/2",
                )}
              >
                <span className="size-2 scale-50 rounded-full bg-brand-500 opacity-0 transition-[scale,opacity] duration-200 ease-out group-data-on:scale-100 group-data-on:opacity-100" />
              </span>

              <div data-card>
                <p className="text-sm font-semibold text-brand-600">
                  {s.when} <span className="font-medium text-muted">· {s.level}</span>
                </p>
                <h3 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
                <ul className={clsx("mt-4 flex flex-wrap gap-1.5", !right && "md:justify-end")}>
                  {s.modules.map((m) => (
                    <li key={m} className="rounded-full border border-line bg-card px-2.5 py-1 text-xs font-medium">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
