export type ScoreScale = "1-5" | "1-100";

export interface ScorePresentation {
  rawFive: number;
  displayValue: string;
  maxLabel: string;
  predicate: string;
  badgeClass: string;
}

export function getPredicate(scoreFive: number): {
  predicate: string;
  badgeClass: string;
} {
  if (scoreFive >= 4.5) {
    return {
      predicate: "Unggul",
      badgeClass: "bg-emerald-100 text-emerald-800",
    };
  }
  if (scoreFive >= 3.75) {
    return {
      predicate: "Mahir",
      badgeClass: "bg-blue-100 text-blue-800",
    };
  }
  if (scoreFive >= 3.0) {
    return {
      predicate: "Cakap",
      badgeClass: "bg-amber-100 text-amber-800",
    };
  }
  if (scoreFive >= 2.0) {
    return {
      predicate: "Berkembang",
      badgeClass: "bg-orange-100 text-orange-800",
    };
  }
  return {
    predicate: "Pemula",
    badgeClass: "bg-slate-100 text-slate-700",
  };
}

export function formatScore(
  scoreFive: number,
  scale: ScoreScale = "1-5"
): ScorePresentation {
  const safeScore = Number.isFinite(scoreFive) ? scoreFive : 0;
  const { predicate, badgeClass } = getPredicate(safeScore);

  if (scale === "1-100") {
    const score100 = Math.round(safeScore * 20);
    return {
      rawFive: safeScore,
      displayValue: String(score100),
      maxLabel: "/ 100",
      predicate,
      badgeClass,
    };
  }

  return {
    rawFive: safeScore,
    displayValue: safeScore.toFixed(2),
    maxLabel: "/ 5.00",
    predicate,
    badgeClass,
  };
}