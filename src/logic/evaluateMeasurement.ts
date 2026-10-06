import type {
  BodyInput,
  FitRule,
  MeasurementEvaluation,
  Product,
  ProductSize,
} from "../domain/types";
import { fieldLabels, measurementFields } from "../data/fitRules";
import { calculateEase } from "./calculateEase";
export function evaluateMeasurement(
  input: BodyInput,
  product: Product,
  size: ProductSize,
  rule: FitRule,
): MeasurementEvaluation {
  const field = measurementFields[rule.measurement];
  const bodyValue = input[field];
  const garmentValue =
    field === "height"
      ? size.nominalHeight
      : (size[field as keyof ProductSize] as number | undefined);
  const base: MeasurementEvaluation = {
    measurement: rule.measurement,
    bodyValue,
    garmentValue,
    level: "not_evaluated",
    hardFailure: false,
    message: `${fieldLabels[field]}：判定なし`,
  };
  if (bodyValue === undefined || garmentValue === undefined) return base;
  let difference = calculateEase(garmentValue, bodyValue);
  if (
    rule.measurement === "waist_ease" &&
    ["slacks", "skirt", "gym_bottom"].includes(product.category)
  ) {
    base.effectiveWaistMin =
      garmentValue + (size.waistAdjustMin ?? product.waistAdjustMin ?? 0);
    base.effectiveWaistMax =
      garmentValue + (size.waistAdjustMax ?? product.waistAdjustMax ?? 0);
    // 対応範囲内=0。範囲外は最も近い調整値と身体寸法の差でHARD評価。
    difference =
      bodyValue < base.effectiveWaistMin
        ? base.effectiveWaistMin - bodyValue
        : bodyValue > base.effectiveWaistMax
          ? base.effectiveWaistMax - bodyValue
          : 0;
  }
  const belowHard = rule.hardMin !== undefined && difference < rule.hardMin;
  const aboveHard = rule.hardMax !== undefined && difference > rule.hardMax;
  let level: MeasurementEvaluation["level"];
  if (belowHard) level = "ng_small";
  else if (aboveHard) level = "ng_large";
  else if (difference >= rule.idealMin && difference <= rule.idealMax)
    level = "ideal";
  else if (difference < rule.acceptableMin) level = "caution_small";
  else if (difference > rule.idealMax) level = "caution_large";
  else level = "good";
  const hardFailure = rule.hardConstraint && (belowHard || aboveHard);
  const range =
    base.effectiveWaistMin !== undefined
      ? `対応範囲 ${base.effectiveWaistMin}～${base.effectiveWaistMax}cm`
      : `製品 ${garmentValue} − 身体 ${bodyValue} = ${Number(difference.toFixed(2))}cm`;
  return {
    ...base,
    difference,
    level,
    hardFailure,
    message: `${fieldLabels[field]}：${range}${hardFailure ? (belowHard ? "（不足・HARD NG）" : "（大きすぎ・HARD NG）") : ""}`,
  };
}
