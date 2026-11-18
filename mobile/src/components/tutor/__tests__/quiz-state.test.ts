/// <reference types="jest" />
import type { PracticeQuestion } from "@/lib/types";
import { isCorrect, practiceMessage, quizReducer, startQuiz, tallyPractice } from "../quiz-state";

const q = (correct: number): PracticeQuestion => ({ prompt: `Q${correct}`, options: ["a", "b", "c", "d"], correct_option: correct, explanation: "" });
const questions = [q(0), q(2), q(3)];

describe("quizReducer", () => {
  const reduce = quizReducer(questions);

  it("starts on the first question with nothing answered", () => {
    expect(startQuiz(questions)).toEqual({ index: 0, answers: [null, null, null], finished: false });
    expect(startQuiz([]).finished).toBe(true);
  });

  it("records one answer per question and ignores changes afterwards", () => {
    const s1 = reduce(startQuiz(questions), { type: "answer", option: 1 });
    expect(s1.answers[0]).toBe(1);
    expect(reduce(s1, { type: "answer", option: 0 })).toBe(s1);
  });

  it("rejects out-of-range options", () => {
    const s0 = startQuiz(questions);
    expect(reduce(s0, { type: "answer", option: 4 })).toBe(s0);
    expect(reduce(s0, { type: "answer", option: -1 })).toBe(s0);
  });

  it("won't advance until the current question is answered, then finishes after the last", () => {
    let s = startQuiz(questions);
    expect(reduce(s, { type: "next" })).toBe(s);
    for (const option of [0, 1, 3]) {
      s = reduce(s, { type: "answer", option });
      s = reduce(s, { type: "next" });
    }
    expect(s.finished).toBe(true);
    expect(s.answers).toEqual([0, 1, 3]);
    expect(reduce(s, { type: "restart" })).toEqual(startQuiz(questions));
  });
});

describe("practice tally", () => {
  it("counts right answers and lists the rest for review", () => {
    expect(tallyPractice(questions, [0, 1, 3])).toEqual({ right: 2, total: 3, review: [1] });
    expect(tallyPractice(questions, [null, null, null])).toEqual({ right: 0, total: 3, review: [0, 1, 2] });
  });

  it("isCorrect treats unanswered as not correct", () => {
    expect(isCorrect(q(0), null)).toBe(false);
    expect(isCorrect(q(0), 0)).toBe(true);
  });

  it("practiceMessage never reads like a grade", () => {
    for (const [r, t] of [[0, 5], [3, 5], [5, 5], [0, 0]] as const) {
      const m = practiceMessage(r, t);
      expect(m).not.toMatch(/%|grade|score|pass|fail/i);
    }
  });
});
