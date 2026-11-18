/**
 * Pure state for the tutor's practice quiz. Product rule: these AI-generated questions are practice only. The tally
 * lives in component state for this session, is never sent to the server and is never shown as a grade or percentage.
 */
import type { PracticeQuestion } from "@/lib/types";

export interface QuizProgress {
  index: number;
  /** The option the student picked for each question, or null if not answered yet. */
  answers: (number | null)[];
  finished: boolean;
}

export type QuizAction = { type: "answer"; option: number } | { type: "next" } | { type: "restart" };

export function startQuiz(questions: PracticeQuestion[]): QuizProgress {
  return { index: 0, answers: questions.map(() => null), finished: questions.length === 0 };
}

export function quizReducer(questions: PracticeQuestion[]) {
  return (state: QuizProgress, action: QuizAction): QuizProgress => {
    switch (action.type) {
      case "answer": {
        const q = questions[state.index];
        // One try per question: feedback is immediate, so changing the answer afterwards would be meaningless.
        if (!q || state.finished || state.answers[state.index] !== null) return state;
        if (!Number.isInteger(action.option) || action.option < 0 || action.option >= q.options.length) return state;
        const answers = [...state.answers];
        answers[state.index] = action.option;
        return { ...state, answers };
      }
      case "next":
        if (state.answers[state.index] === null || state.finished) return state;
        if (state.index + 1 >= questions.length) return { ...state, finished: true };
        return { ...state, index: state.index + 1 };
      case "restart":
        return startQuiz(questions);
    }
  };
}

export function isCorrect(q: PracticeQuestion, answer: number | null): boolean {
  return answer !== null && answer === q.correct_option;
}

/** Practice tally for the summary screen: how many were right, and which ones to review. */
export function tallyPractice(questions: PracticeQuestion[], answers: (number | null)[]) {
  let right = 0;
  const review: number[] = [];
  questions.forEach((q, i) => {
    if (isCorrect(q, answers[i] ?? null)) right += 1;
    else review.push(i);
  });
  return { right, total: questions.length, review };
}

/** Encouraging, non-evaluative line for the summary. Never a grade. */
export function practiceMessage(right: number, total: number): string {
  if (total === 0) return "No questions this time.";
  if (right === total) return "All of them. Nice work.";
  if (right * 2 >= total) return "Good practice. Look over the ones you missed.";
  return "That's what practice is for. Review the explanations and try again.";
}
