"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import { Bot } from "lucide-react";

/**
 * The hero's proof: one question, answered at the visitor's level and in their language. The kite on the right rail
 * climbs with the level. Answers are written examples of the tutor's style (labelled), not live model output.
 */

type Level = "school" | "college" | "university";
type Lang = "en" | "bn";

const LEVELS: { id: Level; en: string; bn: string; altitude: number }[] = [
  { id: "school", en: "School", bn: "স্কুল", altitude: 0.18 },
  { id: "college", en: "College", bn: "কলেজ", altitude: 0.52 },
  { id: "university", en: "University", bn: "বিশ্ববিদ্যালয়", altitude: 0.86 },
];

const QUESTION: Record<Lang, string> = { en: "What is machine learning?", bn: "মেশিন লার্নিং কী?" };

const ANSWERS: Record<Level, Record<Lang, string>> = {
  school: {
    en: "Imagine teaching a friend to spot ripe mangoes. You show them lots of ripe and unripe ones until they can tell on their own. Machine learning is the same idea: the computer learns from many examples instead of being told every rule.",
    bn: "ধরো, তুমি এক বন্ধুকে পাকা আম চেনাতে চাও। অনেকগুলো পাকা আর কাঁচা আম দেখালে একসময় সে নিজেই চিনে ফেলে। মেশিন লার্নিংও তাই: কম্পিউটার প্রতিটা নিয়ম না শিখে অনেক উদাহরণ দেখে নিজে শেখে।",
  },
  college: {
    en: "Machine learning builds programs that improve from data. You give a model examples with answers (inputs and labels), it finds the pattern, then predicts answers for new inputs, like estimating exam marks from hours of study.",
    bn: "মেশিন লার্নিং হলো এমন প্রোগ্রাম বানানো, যা ডেটা থেকে উন্নত হয়। মডেলকে উত্তরসহ উদাহরণ (ইনপুট ও লেবেল) দেওয়া হয়, সে প্যাটার্ন খুঁজে নেয়, তারপর নতুন ইনপুটের উত্তর অনুমান করে, যেমন পড়ার সময় দেখে পরীক্ষার নম্বর অনুমান করা।",
  },
  university: {
    en: "ML fits a function f(x; θ) to data by minimising a loss, such as cross-entropy with gradient descent, so the model generalises to unseen samples. Watch the train/validation split, overfitting, regularisation and the bias-variance trade-off.",
    bn: "মেশিন লার্নিং ডেটার উপর একটি ফাংশন f(x; θ) ফিট করে, লস (যেমন ক্রস-এনট্রপি) গ্রেডিয়েন্ট ডিসেন্ট দিয়ে কমিয়ে, যাতে মডেল অদেখা ডেটাতেও কাজ করে। মূল ধারণা: ট্রেন/ভ্যালিডেশন ভাগ, ওভারফিটিং, রেগুলারাইজেশন আর বায়াস-ভ্যারিয়েন্স ট্রেড-অফ।",
  },
};

const EASE = [0.23, 1, 0.32, 1] as const;

export function LevelTutor() {
  const [level, setLevel] = useState<Level>("school");
  const [lang, setLang] = useState<Lang>("en");
  const reduce = useReducedMotion();
  const current = LEVELS.find((l) => l.id === level)!;

  return (
    <div className="relative rounded-[20px] border border-line bg-card/95 p-1.5 shadow-[0_24px_60px_-24px_rgb(23_32_51/0.35)] backdrop-blur dark:shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]">
      <div className="flex gap-3 rounded-[14px] bg-card p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              <Bot className="size-4 text-brand-600" aria-hidden /> AI Smart Tutor
            </p>
            <div className="flex rounded-lg border border-line p-0.5 text-xs font-medium" role="group" aria-label="Answer language">
              {(["en", "bn"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={clsx(
                    "rounded-md px-2 py-1 transition-colors duration-150",
                    lang === l ? "bg-ink text-card" : "text-muted hover:text-ink",
                  )}
                >
                  {l === "en" ? "EN" : "বাংলা"}
                </button>
              ))}
            </div>
          </div>

          <p lang={lang} className="mt-4 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2 text-sm font-medium text-white">
            {QUESTION[lang]}
          </p>

          <div className="mt-3 rounded-2xl rounded-bl-md bg-surface px-3.5 py-3">
            <div className="grid">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.p
                  key={`${level}-${lang}`}
                  lang={lang}
                  initial={reduce ? false : { opacity: 0, filter: "blur(4px)", y: 6 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, filter: "blur(4px)", y: -4 }}
                  transition={{ duration: 0.26, ease: EASE }}
                  className="col-start-1 row-start-1 min-h-[7.5rem] text-[13.5px] leading-relaxed text-ink sm:min-h-[6.5rem]"
                >
                  {ANSWERS[level][lang]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-4" role="radiogroup" aria-label="Your level">
            <p className="mb-2 text-xs font-medium text-muted">Same question, your level:</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={level === l.id}
                  onClick={() => setLevel(l.id)}
                  className={clsx(
                    "relative rounded-lg px-2 py-2 text-xs font-semibold transition-[color,transform] duration-150 ease-out active:scale-[0.97] sm:text-sm",
                    level === l.id ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {level === l.id && (
                    <motion.span
                      layoutId="tutor-level-pill"
                      transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0 }}
                      className="absolute inset-0 rounded-lg bg-card shadow-card"
                    />
                  )}
                  <span className="relative" lang={lang}>{lang === "en" ? l.en : l.bn}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted">Example answers showing how the tutor adapts. Real answers come from the live tutor after you sign in.</p>
        </div>

        {/* Altitude rail: the kite climbs as the level rises. */}
        <div className="relative hidden w-7 shrink-0 sm:block" aria-hidden>
          <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--color-line)_0_4px,transparent_4px_8px)]" />
          {/* The inner box is as tall as the rail, so a percentage translate moves the kite along it (transform only). */}
          <motion.div
            className="absolute inset-x-0 top-2 bottom-8"
            initial={false}
            animate={{ y: `${(1 - current.altitude) * 100}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.6, bounce: 0.1 }}
          >
            <svg width="22" height="26" viewBox="0 0 20 24" className="absolute top-0 left-1/2 -translate-x-1/2">
              <path d="M10 0 L19 8 L10 19 L1 8 Z" fill="#f97316" />
              <path d="M10 0 L1 8 L10 8 Z" fill="#fdba74" />
              <path d="M10 8 L19 8 L10 19 Z" fill="#ea580c" />
              <path d="M10 19 q3 2 0 5" stroke="currentColor" className="text-muted" strokeWidth="1" fill="none" />
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
