"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

/**
 * Light/dark switch: the sun's rays fold in and a shadow disc slides over it to make a crescent moon, while the new
 * theme spreads from the button as a circle (View Transitions API, skipped where unsupported or with reduced motion).
 * Modelled on the "morphing sun and moon + organic page reveal" toggles on 21st.dev; written for this codebase.
 */
const EASE = [0.23, 1, 0.32, 1] as const;
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
const noop = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const reduce = useReducedMotion();
  // false during SSR and hydration, true afterwards: the server can't know the visitor's theme.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const dark = mounted && resolvedTheme === "dark";
  const t = { duration: reduce ? 0 : 0.32, ease: EASE };

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next = dark ? "light" : "dark";
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || reduce) {
      setTheme(next);
      return;
    }
    const x = e.clientX || window.innerWidth - 40;
    const y = e.clientY || 32;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const vt = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 480, easing: "cubic-bezier(0.32, 0.72, 0, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={clsx(
        "grid size-9 place-items-center rounded-lg text-muted transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface hover:text-ink active:scale-[0.94]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="none">
        <mask id="theme-toggle-moon">
          <rect width="24" height="24" fill="white" />
          <motion.circle initial={false} animate={{ cx: dark ? 17 : 30, cy: dark ? 7 : 0 }} transition={t} r="7" fill="black" />
        </mask>
        <motion.circle
          cx="12"
          cy="12"
          initial={false}
          animate={{ r: dark ? 8.5 : 4.5 }}
          transition={t}
          fill="currentColor"
          mask="url(#theme-toggle-moon)"
        />
        <motion.g
          initial={false}
          animate={{ opacity: dark ? 0 : 1, rotate: dark ? -45 : 0, scale: dark ? 0.6 : 1 }}
          transition={t}
          style={{ originX: "12px", originY: "12px" }}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {RAYS.map((deg) => (
            <line key={deg} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${deg} 12 12)`} />
          ))}
        </motion.g>
      </svg>
    </button>
  );
}
