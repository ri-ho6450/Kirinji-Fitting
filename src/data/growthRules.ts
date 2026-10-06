import type { GrowthRule, ProductCategory } from "../domain/types";
// 暫定の候補検索範囲。成長予測ではなく、現在Fitを通過した上衣のみを対象とする。
export const growthRules: GrowthRule[] = (
  ["gakuran", "blazer", "shirt", "gym_top"] as ProductCategory[]
).flatMap((productCategory) => [
  {
    gender: "male",
    schoolStage: "junior_high",
    productCategory,
    targetGrowthMin: 10,
    targetGrowthMax: 15,
    priority: 1,
  },
  {
    gender: "female",
    schoolStage: "junior_high",
    productCategory,
    targetGrowthMin: 5,
    targetGrowthMax: 10,
    priority: 1,
  },
]);
