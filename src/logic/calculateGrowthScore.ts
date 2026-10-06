import type {
  BodyInput,
  FitRule,
  GrowthRule,
  Product,
  SizeEvaluation,
} from "../domain/types";
export function isAcceptableCurrentFit(
  evaluation: SizeEvaluation,
  rules: FitRule[],
): boolean {
  return (
    evaluation.eligible &&
    evaluation.measurements.every((m) => {
      if (m.difference === undefined) return true;
      const rule = rules.find((r) => r.measurement === m.measurement)!;
      return (
        m.difference >= rule.acceptableMin && m.difference <= rule.acceptableMax
      );
    })
  );
}
export function calculateGrowthScore(
  input: BodyInput,
  product: Product,
  evaluation: SizeEvaluation,
  growthRules: GrowthRule[],
): { growthScore?: number; growthRoom?: number } {
  const growthRule = growthRules
    .filter(
      (r) =>
        r.gender === input.gender &&
        r.schoolStage === input.schoolStage &&
        r.productCategory === product.category,
    )
    .sort((a, b) => b.priority - a.priority)[0];
  if (
    !growthRule ||
    evaluation.size.nominalHeight === undefined ||
    input.height === undefined
  )
    return {};
  const growthRoom = evaluation.size.nominalHeight - input.height;
  const min = growthRule.targetGrowthMin ?? 0,
    max = growthRule.targetGrowthMax ?? min;
  if (growthRoom < 0 || growthRoom > max) return { growthRoom, growthScore: 0 };
  return {
    growthRoom,
    growthScore: Math.round(Math.min(1, growthRoom / Math.max(min, 1)) * 100),
  };
}

export function hasUsefulGrowthRoom(
  candidate: SizeEvaluation,
  current: SizeEvaluation,
): boolean {
  // 呼称身長だけが増えても不可。実際の製品寸法・対応範囲にも余裕が増えること。
  return candidate.measurements.some((m) => {
    if (m.measurement === "height_diff" || m.difference === undefined)
      return false;
    const before = current.measurements.find(
      (x) => x.measurement === m.measurement,
    );
    if (!before || before.difference === undefined) return false;
    if (m.measurement === "waist_ease" && m.effectiveWaistMax !== undefined)
      return (
        m.effectiveWaistMax > (before.effectiveWaistMax ?? m.effectiveWaistMax)
      );
    return m.difference > before.difference;
  });
}
