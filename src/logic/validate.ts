import type {
  BodyInput,
  Product,
  ProductSize,
  RuleSet,
  MasterData,
} from "../domain/types";
import {
  requiredFields,
  measurementFields,
  fieldLabels,
  categoryLabels,
} from "../data/fitRules";
export function validateRules(set: RuleSet): string[] {
  const errors: string[] = [];
  if (
    !set ||
    !set.id ||
    !(set.category in categoryLabels) ||
    !Array.isArray(set.rules) ||
    !set.rules.length
  )
    return ["判定ルールが未登録です"];
  const seen = new Set<string>();
  for (const r of set.rules) {
    if (
      !(r.measurement in measurementFields) ||
      r.category !== set.category ||
      seen.has(r.measurement) ||
      !r.id ||
      typeof r.hardConstraint !== "boolean"
    )
      errors.push("ルールの部位・カテゴリ・IDに矛盾があります");
    seen.add(r.measurement);
    if (
      ![
        r.idealMin,
        r.idealMax,
        r.acceptableMin,
        r.acceptableMax,
        r.weight,
      ].every(Number.isFinite) ||
      r.weight < 0 ||
      r.acceptableMin > r.idealMin ||
      r.idealMin > r.idealMax ||
      r.idealMax > r.acceptableMax
    )
      errors.push("ルールの許容範囲・重みに矛盾があります");
    if (
      (r.hardMin !== undefined &&
        (!Number.isFinite(r.hardMin) || r.hardMin > r.acceptableMin)) ||
      (r.hardMax !== undefined &&
        (!Number.isFinite(r.hardMax) || r.hardMax < r.acceptableMax))
    )
      errors.push("HARD境界が許容範囲と矛盾しています");
  }
  if (!set.rules.some((r) => r.weight > 0))
    errors.push("ルールの重みがすべて0です");
  const needed = requiredFields[set.category].filter(
    (f) =>
      f !== "height" &&
      !(
        f === "waist" &&
        ["gakuran", "blazer", "shirt", "gym_top"].includes(set.category)
      ),
  );
  for (const f of needed) {
    const r = set.rules.find((r) => measurementFields[r.measurement] === f);
    if (!r) errors.push(`${fieldLabels[f]}のルールがありません`);
    if (
      ["chest", "shoulder", "sleeve", "waist", "hip"].includes(f) &&
      r &&
      (!r.hardConstraint || r.hardMin === undefined)
    )
      errors.push(`${fieldLabels[f]}のHARD条件が未設定です`);
  }
  return errors;
}
export function validateSizes(
  product: Product,
  sizes: ProductSize[],
  set: RuleSet,
): string[] {
  const errors: string[] = [];
  if (!sizes.length) return ["学校・商品に紐づく寸法表が未登録です"];
  const ids = new Set<string>(),
    names = new Set<string>(),
    orders = new Set<number>();
  for (const size of sizes) {
    if (
      !size.id ||
      !size.sizeName?.trim() ||
      size.productId !== product.id ||
      ids.has(size.id) ||
      names.has(size.sizeName) ||
      !Number.isFinite(size.sortOrder) ||
      orders.has(size.sortOrder)
    )
      errors.push("サイズID・商品・サイズ名・並び順に矛盾があります");
    ids.add(size.id);
    names.add(size.sizeName);
    orders.add(size.sortOrder);
    for (const field of [
      "chest",
      "waist",
      "hip",
      "shoulder",
      "sleeve",
      "length",
      "inseam",
      "neck",
      "nominalHeight",
    ] as const) {
      if (
        size[field] !== undefined &&
        (!Number.isFinite(size[field]) || size[field]! <= 0)
      )
        errors.push(`${size.sizeName}の製品寸法が不正です`);
    }
    for (const rule of set.rules) {
      const field = measurementFields[rule.measurement];
      if (rule.hardConstraint && size[field as keyof ProductSize] === undefined)
        errors.push(
          `${size.sizeName}の${fieldLabels[field]}製品寸法がありません`,
        );
      if (
        requiredFields[product.category].includes(field) &&
        field !== "height" &&
        size[field as keyof ProductSize] === undefined
      )
        errors.push(
          `${size.sizeName}の${fieldLabels[field]}製品寸法がありません`,
        );
    }
    const min = size.waistAdjustMin ?? product.waistAdjustMin ?? 0,
      max = size.waistAdjustMax ?? product.waistAdjustMax ?? 0;
    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min > max ||
      (size.waist !== undefined && size.waist + min <= 0)
    )
      errors.push(`${size.sizeName}のウエスト調整範囲が不正です`);
  }
  return [...new Set(errors)];
}
export function validateInput(input: BodyInput, product: Product): string[] {
  const errors: string[] = [];
  for (const field of requiredFields[product.category] ?? [])
    if (input[field] === undefined)
      errors.push(`${fieldLabels[field]}を入力してください`);
  for (const field of Object.keys(fieldLabels) as (keyof typeof fieldLabels)[])
    if (
      input[field] !== undefined &&
      (!Number.isFinite(input[field]) || input[field]! <= 0)
    )
      errors.push(`${fieldLabels[field]}は正の数で入力してください`);
  if (
    !product.active ||
    (product.gender !== "both" && product.gender !== input.gender)
  )
    errors.push("性別または有効な商品をご確認ください");
  for (const value of [product.sleeveExtendable, product.hemExtendable])
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      errors.push("袖出し・裾出し寸法が不正です");
  return errors;
}
export function validateMaster(value: unknown): asserts value is MasterData {
  const m = value as MasterData;
  if (
    !m ||
    m.version !== 2 ||
    !["schools", "products", "sizes", "ruleSets", "growthRules"].every((k) =>
      Array.isArray((m as unknown as Record<string, unknown>)[k]),
    )
  )
    throw new Error("V2マスタ形式が不正です");
  for (const list of [m.schools, m.products, m.sizes, m.ruleSets])
    if (
      new Set(list.map((x) => x.id)).size !== list.length ||
      list.some((x) => !x.id)
    )
      throw new Error("マスタIDが重複または未設定です");
  if (m.schools.some((s) => !s.name?.trim()))
    throw new Error("学校名が未設定です");
  for (const set of m.ruleSets) {
    const e = validateRules(set);
    if (e.length) throw new Error(e.join("／"));
  }
  for (const p of m.products) {
    const set = m.ruleSets.find(
      (r) => r.id === p.sizeRuleId && r.category === p.category,
    );
    if (
      !p.name?.trim() ||
      !m.schools.some((s) => s.id === p.schoolId) ||
      !set ||
      !["male", "female", "both"].includes(p.gender) ||
      typeof p.active !== "boolean"
    )
      throw new Error("商品マスタの参照先が不正です");
    if (
      [p.sleeveExtendable, p.hemExtendable].some(
        (n) => n !== undefined && (!Number.isFinite(n) || n < 0),
      )
    )
      throw new Error("袖出し・裾出し寸法が不正です");
    if (
      (p.waistAdjustMin !== undefined && !Number.isFinite(p.waistAdjustMin)) ||
      (p.waistAdjustMax !== undefined && !Number.isFinite(p.waistAdjustMax)) ||
      (p.waistAdjustMin ?? 0) > (p.waistAdjustMax ?? 0)
    )
      throw new Error("ウエスト調整範囲が不正です");
    const sizes = m.sizes.filter((s) => s.productId === p.id);
    if (sizes.length) {
      const e = validateSizes(p, sizes, set);
      if (e.length) throw new Error(e.join("／"));
    }
  }
  if (m.sizes.some((s) => !m.products.some((p) => p.id === s.productId)))
    throw new Error("サイズの商品参照先がありません");
  for (const g of m.growthRules)
    if (
      !["male", "female"].includes(g.gender) ||
      !["elementary", "junior_high", "high_school"].includes(g.schoolStage) ||
      !(g.productCategory in categoryLabels) ||
      !Number.isFinite(g.priority) ||
      (g.targetGrowthMin !== undefined &&
        (!Number.isFinite(g.targetGrowthMin) || g.targetGrowthMin < 0)) ||
      (g.targetGrowthMax !== undefined &&
        (!Number.isFinite(g.targetGrowthMax) ||
          g.targetGrowthMax < (g.targetGrowthMin ?? 0)))
    )
      throw new Error("成長ルールが不正です");
}
