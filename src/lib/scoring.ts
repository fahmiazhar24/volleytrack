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

export interface PredicateRule {
  key: "unggul" | "mahir" | "cakap" | "berkembang" | "pemula";
  label_id: string;
  label_en: string;
  min_score: number;
  color: "emerald" | "blue" | "amber" | "orange" | "slate";
}

export const DEFAULT_PREDICATE_RULES: PredicateRule[] = [
  {
    key: "unggul",
    label_id: "Unggul",
    label_en: "Excellent",
    min_score: 4.5,
    color: "emerald",
  },
  {
    key: "mahir",
    label_id: "Mahir",
    label_en: "Proficient",
    min_score: 3.75,
    color: "blue",
  },
  {
    key: "cakap",
    label_id: "Cakap",
    label_en: "Competent",
    min_score: 3.0,
    color: "amber",
  },
  {
    key: "berkembang",
    label_id: "Berkembang",
    label_en: "Developing",
    min_score: 2.0,
    color: "orange",
  },
  {
    key: "pemula",
    label_id: "Pemula",
    label_en: "Beginner",
    min_score: 0,
    color: "slate",
  },
];

export function normalizePredicateRules(raw: unknown): PredicateRule[] {
  if (!Array.isArray(raw) || raw.length !== DEFAULT_PREDICATE_RULES.length) {
    return DEFAULT_PREDICATE_RULES;
  }

  return DEFAULT_PREDICATE_RULES.map((def, idx) => {
    const item = raw[idx] as Partial<PredicateRule> | undefined;
    const minScore =
      idx === DEFAULT_PREDICATE_RULES.length - 1
        ? 0
        : typeof item?.min_score === "number" && !Number.isNaN(item.min_score)
          ? item.min_score
          : def.min_score;

    return {
      key: def.key,
      label_id: item?.label_id?.trim() || def.label_id,
      label_en: item?.label_en?.trim() || def.label_en,
      min_score: minScore,
      color: def.color,
    };
  });
}

export function resolvePredicateWithRules(
  score1to5: number,
  rawRules?: unknown
): PredicateRule {
  const rules = normalizePredicateRules(rawRules);
  for (const rule of rules) {
    if (score1to5 >= rule.min_score) {
      return rule;
    }
  }
  return rules[rules.length - 1];
}