import type {
  BodyMeasurement,
  FitRule,
  MeasurementType,
  ProductCategory,
  RuleSet,
} from "../domain/types";
export const categoryLabels: Record<ProductCategory, string> = {
  gakuran: "詰襟",
  blazer: "ブレザー",
  shirt: "シャツ",
  slacks: "スラックス",
  skirt: "スカート",
  gym_top: "体操服（上）",
  gym_bottom: "体操服（下）",
  other: "その他",
};
export const measurementFields: Record<MeasurementType, BodyMeasurement> = {
  chest_ease: "chest",
  waist_ease: "waist",
  hip_ease: "hip",
  shoulder_ease: "shoulder",
  sleeve_diff: "sleeve",
  length_diff: "length",
  inseam_diff: "inseam",
  height_diff: "height",
};
export const fieldLabels: Record<BodyMeasurement, string> = {
  height: "身長",
  weight: "体重",
  chest: "胸囲",
  waist: "ウエスト",
  hip: "ヒップ",
  shoulder: "肩幅",
  sleeve: "必要袖丈",
  length: "必要着丈／丈",
  inseam: "股下",
};
export const requiredFields: Record<ProductCategory, BodyMeasurement[]> = {
  gakuran: ["height", "chest", "shoulder", "sleeve", "waist"],
  blazer: ["height", "chest", "shoulder", "sleeve", "waist"],
  shirt: ["height", "chest", "shoulder", "sleeve", "waist"],
  gym_top: ["height", "chest", "shoulder", "sleeve", "waist"],
  slacks: ["height", "waist", "hip", "inseam"],
  skirt: ["height", "waist", "hip", "length"],
  gym_bottom: ["height", "waist", "hip", "inseam"],
  other: ["height"],
};
// 暫定値。実店舗での試着検証後に設定ファイルまたは管理画面で補正する。
// 胸囲: <15 NG, [15,20) 小さめ, [20,24) 適正, [24,28] 推奨, (28,32] 大きめ, >32 NG。
const top = [
  {
    measurement: "chest_ease",
    hardMin: 15,
    hardMax: 32,
    idealMin: 24,
    idealMax: 28,
    acceptableMin: 20,
    acceptableMax: 32,
    weight: 0.35,
    hardConstraint: true,
  },
  {
    measurement: "shoulder_ease",
    hardMin: 0,
    hardMax: 3.5,
    idealMin: 1,
    idealMax: 2.5,
    acceptableMin: 0,
    acceptableMax: 3.5,
    weight: 0.3,
    hardConstraint: true,
  },
  {
    measurement: "sleeve_diff",
    hardMin: -2,
    hardMax: 6,
    idealMin: 0,
    idealMax: 2,
    acceptableMin: -1,
    acceptableMax: 4,
    weight: 0.2,
    hardConstraint: true,
  },
  {
    measurement: "length_diff",
    idealMin: 0,
    idealMax: 3,
    acceptableMin: -2,
    acceptableMax: 6,
    weight: 0.1,
    hardConstraint: false,
  },
  {
    measurement: "height_diff",
    idealMin: 0,
    idealMax: 5,
    acceptableMin: -5,
    acceptableMax: 15,
    weight: 0.05,
    hardConstraint: false,
  },
] satisfies Omit<FitRule, "id" | "category">[];
const bottom = (skirt: boolean): Omit<FitRule, "id" | "category">[] => [
  {
    measurement: "waist_ease",
    hardMin: 0,
    hardMax: 0,
    idealMin: 0,
    idealMax: 0,
    acceptableMin: 0,
    acceptableMax: 0,
    weight: skirt ? 0.45 : 0.5,
    hardConstraint: true,
  },
  {
    measurement: "hip_ease",
    hardMin: 4,
    idealMin: 6,
    idealMax: 10,
    acceptableMin: 4,
    acceptableMax: 14,
    weight: skirt ? 0.35 : 0.3,
    hardConstraint: true,
  },
  {
    measurement: skirt ? "length_diff" : "inseam_diff",
    hardMin: -2,
    hardMax: 8,
    idealMin: 0,
    idealMax: 3,
    acceptableMin: -1,
    acceptableMax: 6,
    weight: 0.2,
    hardConstraint: true,
  },
];
export const fitRuleSets: RuleSet[] = (
  Object.keys(categoryLabels) as ProductCategory[]
)
  .filter((c) => c !== "other")
  .map((category) => ({
    id: `default-${category}`,
    category,
    rules: (category === "slacks" || category === "gym_bottom"
      ? bottom(false)
      : category === "skirt"
        ? bottom(true)
        : top
    ).map((r) => ({ ...r, category, id: `${category}-${r.measurement}` })),
  }));
export const fitLabels = {
  ideal: "◎ 推奨",
  good: "○ 適正",
  caution_small: "△ 小さめ",
  caution_large: "△ 大きめ",
  ng_small: "× 小さい",
  ng_large: "× 大きすぎ",
  not_evaluated: "－ 判定なし",
};
