"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

/**
 * One place that registers GSAP plugins and the motion curve, so every animated component uses the same ease as the
 * CSS tokens in globals.css (--ease-out). Import gsap, ScrollTrigger and useGSAP from here, not from "gsap" directly.
 */
gsap.registerPlugin(ScrollTrigger, CustomEase, useGSAP);

export const EASE_OUT = CustomEase.create("ig-out", "0.23, 1, 0.32, 1");

/** Runs the callback only when the visitor hasn't asked for reduced motion; GSAP reverts it if that preference changes. */
export function withMotion(fn: () => void) {
  gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", fn);
}

export { gsap, ScrollTrigger, useGSAP };
