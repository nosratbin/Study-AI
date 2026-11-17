"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Group = { name: string; modules: { id: string; title: string }[] };

/**
 * The page's one rich moment: the module index hangs from the brand kite like the home page's string. A diamond (the
 * kite shape) marks each module; the one you're reading fills orange and the string fills down to it. Scroll spy uses
 * IntersectionObserver, the fill is a scaleY transform, and reduced motion drops the transition.
 */
export function ModuleIndex({ groups }: { groups: Group[] }) {
  const ids = groups.flatMap((g) => g.modules.map((m) => m.id));
  const [active, setActive] = useState(ids[0]);
  const list = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const targets = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
    // ids is derived from static props; join keeps the dependency stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join()]);

  useEffect(() => {
    const box = list.current;
    const marker = box?.querySelector<HTMLElement>(`[data-marker="${active}"]`);
    if (!box || !marker || !fill.current) return;
    const y = marker.offsetTop + marker.offsetHeight / 2;
    fill.current.style.transform = `scaleY(${y / box.offsetHeight})`;
  }, [active]);

  return (
    <nav aria-label="Modules on this page" className="sticky top-24 hidden self-start lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand vector */}
      <img src="/brand/iccheghuri-symbol.svg" alt="" width={256} height={256} className="-ml-3 h-auto w-11 -rotate-6" aria-hidden />
      <div ref={list} className="relative -mt-1 pb-2">
        <span className="absolute top-0 bottom-0 left-[4.5px] w-px bg-line" aria-hidden />
        <span
          ref={fill}
          className="absolute top-0 bottom-0 left-[4.5px] w-px origin-top scale-y-0 bg-brand-500 transition-transform duration-[280ms] ease-out motion-reduce:transition-none"
          aria-hidden
        />
        {groups.map((g) => (
          <div key={g.name} className="pt-5 first:pt-4">
            <p className="pl-6 text-xs font-medium text-muted">{g.name}</p>
            <ul className="mt-1">
              {g.modules.map((m) => {
                const on = m.id === active;
                return (
                  <li key={m.id}>
                    <a
                      href={`#${m.id}`}
                      aria-current={on ? "location" : undefined}
                      className={clsx(
                        "group flex items-center gap-4 rounded-md py-1.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                        on ? "font-medium text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      <span
                        data-marker={m.id}
                        className={clsx(
                          "relative size-2.5 shrink-0 rotate-45 rounded-[2px] border transition-colors duration-200",
                          on ? "border-brand-500 bg-brand-500" : "border-line bg-surface group-hover:border-brand-200",
                        )}
                        aria-hidden
                      />
                      {m.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
