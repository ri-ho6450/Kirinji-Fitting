import type { FitRule, MeasurementEvaluation } from "../domain/types";
export function calculateFitScore(
  measurements: MeasurementEvaluation[],
  rules: FitRule[],
): number {
  let total = 0,
    weight = 0;
  for (const m of measurements) {
    if (m.difference === undefined || m.level === "not_evaluated") continue;
    const rule = rules.find((r) => r.measurement === m.measurement)!;
    const diff = m.difference;
    let score = 100;
    if (diff < rule.idealMin)
      score =
        100 -
        (40 * (rule.idealMin - diff)) /
          Math.max(rule.idealMin - rule.acceptableMin, 1);
    if (diff > rule.idealMax)
      score =
        100 -
        (40 * (diff - rule.idealMax)) /
          Math.max(rule.acceptableMax - rule.idealMax, 1);
    total += Math.max(0, score) * rule.weight;
    weight += rule.weight;
  }
  return weight > 0 ? Math.round(total / weight) : 0;
}
