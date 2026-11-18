/** Suggested prompts for the tutor's empty state, picked for the student's level or the lesson they came from. */
import type { ChatLanguage, EducationLevel } from "@/lib/types";

const BY_LEVEL: Record<EducationLevel | "any", string[]> = {
  school: [
    "What is AI? Explain it like I'm in class 7.",
    "কম্পিউটার কীভাবে চিন্তা করে? সহজ করে বলো।",
    "Give me a fun example of AI in daily life.",
    "How do I start learning to code?",
  ],
  college: [
    "How does a for loop work in Python? Show an example.",
    "Python-এ list আর dictionary-র পার্থক্য কী?",
    "What's the difference between AI, ML and deep learning?",
    "Explain what a dataset is with a simple example.",
  ],
  university: [
    "Explain gradient descent step by step.",
    "overfitting কী, আর কীভাবে কমানো যায়?",
    "When should I use a CNN instead of a plain neural network?",
    "Suggest a portfolio project in machine learning.",
  ],
  any: [
    "What is machine learning? Explain with a simple example.",
    "Python-এ for loop কীভাবে কাজ করে? ধাপে ধাপে বুঝিয়ে দাও।",
    "What's the difference between AI, ML and deep learning?",
    "How do I start learning AI as a beginner?",
  ],
};

export function suggestedPrompts(level: EducationLevel | null | undefined, lessonTitle?: string | null): string[] {
  if (lessonTitle) {
    return [
      `Explain "${lessonTitle}" in simple words.`,
      "Give me an everyday example of this.",
      "এই পাঠের মূল বিষয়গুলো বাংলায় বুঝিয়ে দাও।",
      "What should I remember most from this lesson?",
    ];
  }
  return BY_LEVEL[level ?? "any"];
}

export const LANGUAGES: { value: ChatLanguage; label: string; a11y: string }[] = [
  { value: "auto", label: "Auto", a11y: "Reply language: automatic" },
  { value: "en", label: "English", a11y: "Reply language: English" },
  { value: "bn", label: "বাংলা", a11y: "Reply language: Bangla" },
];
