"use client";

import { useRef, type ReactNode } from "react";
import { EASE_OUT, gsap, useGSAP, withMotion } from "@/lib/gsap";

type From = { x?: number; y?: number; rotation?: number; scale?: number };

/**
 * Scroll reveal for server-rendered content: the items matching `selector` (default: direct children) fade and rise in,
 * staggered, the first time the block scrolls into view. `from` swaps the default rise for another entrance, like the
 * closing kite's launch. Reduced motion: nothing moves, the content is simply there.
 */
export function Reveal({
  children,
  className,
  selector = ":scope > *",
  from = { y: 16 },
  duration = 0.5,
  stagger = 0.06,
}: {
  children: ReactNode;
  className?: string;
  selector?: string;
  from?: From;
  duration?: number;
  stagger?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      withMotion(() => {
        gsap.from(gsap.utils.toArray<HTMLElement>(selector, root.current), {
          ...from,
          autoAlpha: 0,
          duration,
          stagger,
          ease: EASE_OUT,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
