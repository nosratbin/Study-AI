"use client";

import { useRef } from "react";
import clsx from "clsx";
import { FEATURES } from "@/components/marketing";
import { EASE_OUT, gsap, useGSAP, withMotion } from "@/lib/gsap";

/**
 * All nine modules on one board. The tutor, what students come for first, takes the big tile; the other eight fill an
 * even grid around it (2 + 8 cells on two columns, 4 + 8 on four). Copy is the shared FEATURES list used on /features.
 */

export function ModuleBoard() {
  const root = useRef<HTMLDivElement>(null);

  // Tiles rise in, staggered, once the board scrolls into view (GSAP ScrollTrigger). Reduced motion: no animation.
  useGSAP(
    () => {
      withMotion(() => {
        gsap.from(gsap.utils.toArray<HTMLElement>("article", root.current), {
          autoAlpha: 0,
          y: 16,
          duration: 0.5,
          ease: EASE_OUT,
          stagger: 0.06,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map(({ icon: Icon, title, text }) => {
        const big = title === "AI Smart Tutor";
        return (
          <article
            key={title}
            className={clsx(
              "group relative flex flex-col rounded-card border border-line bg-card p-5 transition-[translate,border-color] duration-200 ease-out sm:p-6",
              "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-brand-200",
              big && "sm:col-span-2 lg:row-span-2",
            )}
          >
            <Icon className={clsx(big ? "size-7 text-brand-600" : "size-5 text-muted")} strokeWidth={1.75} aria-hidden />
            <h3 className={clsx("mt-6 font-semibold tracking-tight", big ? "text-2xl" : "text-base")}>{title}</h3>
            <p className={clsx("mt-2 leading-relaxed text-muted", big ? "max-w-md text-[15px]" : "text-sm")}>{text}</p>
            {big && (
              <div className="mt-auto pt-8" aria-hidden>
                <div className="space-y-2 text-[13px]">
                  <p lang="bn" className="ml-auto w-fit rounded-2xl rounded-br-md bg-brand-500 px-3 py-1.5 font-medium text-white">
                    নিউরাল নেটওয়ার্ক কীভাবে শেখে?
                  </p>
                  <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-surface px-3 py-1.5 text-muted">
                    Step 1: it makes a guess. Step 2: it measures how wrong the guess was…
                  </p>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
