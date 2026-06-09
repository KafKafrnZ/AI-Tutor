import { describe, expect, it } from "vitest";

import { scoreWithNegativeMarking } from "@/lib/scoring";

describe("negative marking scoring", () => {
  it("scores all correct answers as 1.0 each", () => {
    expect(scoreWithNegativeMarking([
      { selected: "A", correctAnswer: "A" },
      { selected: "B", correctAnswer: "B" },
    ])).toMatchObject({ score: 2, correctCount: 2 });
  });

  it("deducts 0.25 per wrong answer", () => {
    expect(scoreWithNegativeMarking([
      { selected: "A", correctAnswer: "B" },
      { selected: "C", correctAnswer: "D" },
      { selected: "A", correctAnswer: "A" },
    ])).toMatchObject({ score: 0.5, wrongCount: 2 });
  });

  it("scores skipped answers as 0", () => {
    expect(scoreWithNegativeMarking([
      { selected: null, correctAnswer: "A" },
      { selected: "", correctAnswer: "B" },
      { selected: "C", correctAnswer: "C" },
    ])).toMatchObject({ score: 1, skippedCount: 2 });
  });

  it("floors final score at 0 and never negative", () => {
    expect(scoreWithNegativeMarking([
      { selected: "A", correctAnswer: "B" },
      { selected: "C", correctAnswer: "D" },
    ])).toMatchObject({ score: 0, wrongCount: 2 });
  });
});
