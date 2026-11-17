import { FEATURES } from "@/components/marketing";

/*
 * Per-module detail for /features. The title, icon and one-line summary come from the shared FEATURES list (it also
 * feeds the home page's module board); this file adds what a student can do in each module and the product rule the
 * code enforces behind it. Every line here describes behaviour that exists in the backend: keep it that way.
 */

type Detail = { points: string[]; rule: string };

const DETAILS: Record<string, Detail> = {
  "AI Smart Tutor": {
    points: [
      "Write in Bangla script and it answers in Bangla. Otherwise it replies in the language you chose.",
      "School students get short answers with everyday examples. College students get worked examples and small Python snippets. University students get the maths, the trade-offs and library code.",
      "Answers draw on IccheGhuri lessons and list the ones they used.",
      "Ask for a practice quiz on any topic.",
    ],
    rule: "Practice quizzes stay practice. We don't store them, and they never count toward a score.",
  },
  "Skill Assessment": {
    points: [
      "Each topic gets its own result: 75% or more marks a strength, under 50% marks a gap.",
      "The skill assessment recommends a level. You need 60% of that level's questions right and a pass at the level below.",
      "Topic results feed your roadmap and the opportunity matcher.",
    ],
    rule: "Scores come only from the stored answer key. The correct answers never reach your browser, and the AI can explain a result but never sets it.",
  },
  "Personalised Roadmap": {
    points: [
      "Each stage shows how far you've got and the next lesson to open.",
      "Already know a stage? Score 80% or more on its topic test and skip it.",
    ],
    rule: "A stage moves only when you complete its lessons or pass its topic test.",
  },
  "AI Project Lab": {
    points: [
      "Work through guided challenges set for your level.",
      "Build in Google Colab or GitHub and link your project with an https address.",
      "Ask the AI for suggestions while you work, then submit it for review.",
    ],
    rule: "AI suggestions are never a grade. A teacher reviews each submitted project, and no student code runs on our servers.",
  },
  "Opportunity Hub": {
    points: [
      "The matcher ranks listings by your level, your interests and your assessment results.",
      "Save listings, track each application from planning to result, and add deadlines to Google Calendar.",
      "Saved listings send you a reminder when the deadline is three days away.",
    ],
    rule: "Students only see listings our team has checked against the official source. If a verified listing is edited, it's hidden until someone checks it again. The matcher follows fixed rules, so it can't invent a scholarship, a deadline or a link.",
  },
  "Skill Passport": {
    points: [
      "Completed courses, certificates, assessments and reviewed projects are added for you.",
      "Finish every lesson in a course and its certificate is issued.",
      "Add your own awards. They show as unverified until an admin checks the evidence.",
      "Share a public link that shows only what you chose to make public.",
    ],
    rule: "On public pages, students under 18 appear by first name and last initial. The passport never reads MindCare data.",
  },
  "Career Navigator": {
    points: [
      "Careers are matched to your interests, course progress, certificates, assessment topics and achievements.",
      "Each career shows the skills you already have and the ones still to learn.",
    ],
    rule: "Matching follows fixed rules, not an AI model. It uses only your learning record here and never your MindCare data.",
  },
  MindCare: {
    points: [
      "Log your mood in a few taps and keep a private journal.",
      "Take a short breathing break and build steadier study habits.",
      "Find counsellors and helplines our team has checked, or ask us to contact you.",
    ],
    rule: "Only you can read your check-ins. Staff have no view of them, and grades and dashboards never touch them. Journal notes and support messages are encrypted, and no AI reads your well-being data.",
  },
  "Google Workspace": {
    points: [
      "Save lesson notes as Google Docs in an IccheGhuri folder on your Drive.",
      "Add deadlines and study reminders to a separate calendar you can hide or delete.",
      "Open lesson notebooks in Colab to practise Python.",
    ],
    rule: "You connect it yourself, and each feature asks only for the access it needs: Drive sees only files IccheGhuri creates, and Calendar can only add events. Your Google tokens are encrypted and never reach your browser.",
  },
};

const GROUPS: { name: string; titles: string[] }[] = [
  { name: "Learn", titles: ["AI Smart Tutor", "Skill Assessment", "Personalised Roadmap", "AI Project Lab"] },
  { name: "Grow", titles: ["Opportunity Hub", "Skill Passport", "Career Navigator"] },
  { name: "Support", titles: ["MindCare", "Google Workspace"] },
];

export const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export type Module = (typeof FEATURES)[number] & Detail & { id: string };

export const MODULE_GROUPS: { name: string; modules: Module[] }[] = GROUPS.map(({ name, titles }) => ({
  name,
  modules: titles.map((title) => {
    const feature = FEATURES.find((f) => f.title === title);
    if (!feature) throw new Error(`Unknown module: ${title}`);
    return { ...feature, ...DETAILS[title], id: slug(title) };
  }),
}));
