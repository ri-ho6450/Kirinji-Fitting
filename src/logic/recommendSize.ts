import type {
  BodyInput,
  Product,
  ProductSize,
  RuleSet,
  GrowthRule,
  RecommendationResult,
  SizeEvaluation,
} from "../domain/types";
import { evaluateSize } from "./evaluateSize";
import {
  calculateGrowthScore,
  hasUsefulGrowthRoom,
  isAcceptableCurrentFit,
} from "./calculateGrowthScore";
import { validateInput, validateRules, validateSizes } from "./validate";
export const fittingNotice =
  "この判定結果は、試着するサイズを選ぶための目安です。体型・姿勢・着用感には個人差があります。最終サイズは必ず実際にご試着のうえ決定してください。";
const noResult = (
  warnings: string[],
  allSizes: SizeEvaluation[] = [],
): RecommendationResult => ({
  currentFit: null,
  trialRecommendation: null,
  comparisonCandidates: [],
  allSizes,
  explanation:
    "推奨サイズを判定できません。入力寸法または商品寸法表をご確認ください。",
  warnings,
});
export function recommendSize(
  input: BodyInput,
  product: Product,
  sizes: ProductSize[],
  set: RuleSet | undefined,
  growthRules: GrowthRule[],
): RecommendationResult {
  if (
    !set ||
    set.id !== product.sizeRuleId ||
    set.category !== product.category
  )
    return noResult(["商品に対応する判定ルールがありません"]);
  const errors = [...validateRules(set), ...validateInput(input, product)];
  if (sizes.some((s) => s.productId !== product.id))
    errors.push("他商品の寸法が混在しています");
  errors.push(...validateSizes(product, sizes, set));
  if (errors.length) return noResult([...new Set(errors)]);
  const allSizes = [...sizes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((size) => {
      const evaluated = evaluateSize(input, product, size, set.rules);
      return {
        ...evaluated,
        ...calculateGrowthScore(input, product, evaluated, growthRules),
      };
    });
  const eligible = allSizes.filter((s) => s.eligible);
  if (!eligible.length)
    return noResult(
      [
        "全サイズがHARD条件に違反しています。別規格または個別採寸をご相談ください。",
      ],
      allSizes,
    );
  const byFit = (a: SizeEvaluation, b: SizeEvaluation) =>
    (b.fitScore ?? 0) - (a.fitScore ?? 0) ||
    a.size.sortOrder - b.size.sortOrder;
  const currentFit = [...eligible].sort(byFit)[0];
  const acceptable = eligible
    .filter((s) => isAcceptableCurrentFit(s, set.rules))
    .sort(byFit);
  const baseline = acceptable[0];
  const growthCandidates =
    input.growthConsideration && baseline
      ? acceptable.filter(
          (s) =>
            (s.growthScore ?? 0) > (baseline.growthScore ?? 0) &&
            (s.growthRoom ?? 0) > (baseline.growthRoom ?? 0) &&
            hasUsefulGrowthRoom(s, baseline),
        )
      : [];
  const trialRecommendation =
    [...growthCandidates].sort(
      (a, b) => (b.growthScore ?? 0) - (a.growthScore ?? 0) || byFit(a, b),
    )[0] ??
    baseline ??
    null;
  const comparisonCandidates = [trialRecommendation, currentFit]
    .filter((s): s is SizeEvaluation => s !== null)
    .filter((s, i, arr) => arr.findIndex((x) => x.size.id === s.size.id) === i);
  const extra = acceptable.filter(
    (s) => !comparisonCandidates.some((c) => c.size.id === s.size.id),
  )[0];
  if (extra) comparisonCandidates.push(extra);
  const warnings: string[] = [];
  if (!trialRecommendation)
    warnings.push(
      "HARD条件通過サイズはありますが、現在Fitが許容範囲内のサイズがないため初回試着推奨は出しません。個別の試着採寸をご相談ください。",
    );
  if (input.growthConsideration && currentFit.growthScore === undefined)
    warnings.push(
      "この性別・学校段階・商品に対応する成長ルールまたは呼称身長が未登録です。成長によるサイズアップは行っていません。",
    );
  if (
    allSizes.some((s) =>
      s.measurements.some((m) => m.level === "not_evaluated"),
    )
  )
    warnings.push(
      "任意寸法が未入力・未登録の部位は判定なしです。FitScoreは評価できた部位の重みで再配分しています。",
    );
  const excluded = allSizes
    .filter((s) => !s.eligible)
    .map(
      (s) =>
        `${s.size.sizeName}は${s.hardFailures.join("、")}のため候補外です。`,
    )
    .join("\n");
  return {
    currentFit,
    trialRecommendation,
    comparisonCandidates,
    allSizes,
    warnings,
    explanation: `現在の体型では${currentFit.size.sizeName}が最も近いサイズです。\n${!trialRecommendation ? "推奨サイズを判定できません。許容範囲内の初回試着候補がありません。" : trialRecommendation.size.id !== currentFit.size.id ? `${trialRecommendation.size.sizeName}は現在の身体寸法に対して全ての評価部位が許容範囲内です。${growthCandidates.some((s) => s.size.id === trialRecommendation.size.id) ? "成長余地も増えるため、" : "現在の着用可能な範囲を優先し、"}まずこちらからのご試着をおすすめします。` : "現在Fitを優先し、同じサイズからのご試着をおすすめします。"}${excluded ? "\n" + excluded : ""}`,
  };
}
