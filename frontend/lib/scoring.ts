export type ScoringAnswer = {
  selected: string | null;
  correctAnswer: string;
};

export type ScoringSummary = {
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
};

export function scoreWithNegativeMarking(answers: ScoringAnswer[]): ScoringSummary {
  let rawScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  for (const answer of answers) {
    const selected = answer.selected?.trim().toUpperCase();
    const correct = answer.correctAnswer.trim().toUpperCase();

    if (!selected) {
      skippedCount += 1;
    } else if (selected === correct) {
      rawScore += 1;
      correctCount += 1;
    } else {
      rawScore -= 0.25;
      wrongCount += 1;
    }
  }

  return {
    score: Math.max(0, rawScore),
    correctCount,
    wrongCount,
    skippedCount,
  };
}
