import type { Product, ProductCategory } from "../domain/types";
import { schools } from "./schools";
const templates: [string, ProductCategory, Product["gender"]][] = [
  ["詰襟", "gakuran", "male"],
  ["ブレザー", "blazer", "both"],
  ["冬スラックス", "slacks", "male"],
  ["夏スラックス", "slacks", "male"],
  ["スカート", "skirt", "female"],
  ["長袖シャツ", "shirt", "both"],
  ["体操服（上）", "gym_top", "both"],
  ["体操服（下）", "gym_bottom", "both"],
];
export const products: Product[] = schools.flatMap((s) =>
  templates.map(([name, category, gender], i) => ({
    id: `${s.id}-product-${i + 1}`,
    schoolId: s.id,
    name,
    category,
    gender,
    sizeRuleId: `default-${category}`,
    active: true,
  })),
);
