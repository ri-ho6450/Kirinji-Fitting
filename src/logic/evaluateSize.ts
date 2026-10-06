import type {
  BodyInput,
  Product,
  ProductSize,
  FitRule,
  SizeEvaluation,
} from "../domain/types";
import { evaluateMeasurement } from "./evaluateMeasurement";
import { calculateFitScore } from "./calculateFitScore";
export function evaluateSize(
  input: BodyInput,
  product: Product,
  size: ProductSize,
  rules: FitRule[],
): SizeEvaluation {
  const measurements = rules.map((rule) =>
    evaluateMeasurement(input, product, size, rule),
  );
  const hardFailures = measurements
    .filter((m) => m.hardFailure)
    .map((m) => m.message);
  const eligible = hardFailures.length === 0;
  return {
    size,
    measurements,
    hardFailures,
    eligible,
    fitScore: eligible ? calculateFitScore(measurements, rules) : null,
    summary: eligible ? "HARD条件通過" : `候補外：${hardFailures.join("／")}`,
    futureSleeve:
      size.sleeve === undefined
        ? undefined
        : size.sleeve + (product.sleeveExtendable ?? 0),
    futureLength:
      size.length === undefined || product.category !== "skirt"
        ? undefined
        : size.length + (product.hemExtendable ?? 0),
    futureInseam:
      size.inseam === undefined
        ? undefined
        : size.inseam + (product.hemExtendable ?? 0),
  };
}
