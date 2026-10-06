export type Gender = "male" | "female";
export type SchoolStage = "elementary" | "junior_high" | "high_school";
export type ProductCategory =
  | "gakuran"
  | "blazer"
  | "shirt"
  | "slacks"
  | "skirt"
  | "gym_top"
  | "gym_bottom"
  | "other";
export type BodyMeasurement =
  | "height"
  | "weight"
  | "chest"
  | "waist"
  | "hip"
  | "shoulder"
  | "sleeve"
  | "length"
  | "inseam";
export type MeasurementType =
  | "chest_ease"
  | "waist_ease"
  | "hip_ease"
  | "shoulder_ease"
  | "sleeve_diff"
  | "length_diff"
  | "inseam_diff"
  | "height_diff";
export interface School {
  id: string;
  name: string;
}
export interface Product {
  id: string;
  schoolId: string;
  name: string;
  category: ProductCategory;
  gender: Gender | "both";
  manufacturer?: string;
  productCode?: string;
  sizeRuleId: string;
  sleeveExtendable?: number;
  hemExtendable?: number;
  waistAdjustMin?: number;
  waistAdjustMax?: number;
  active: boolean;
}
export interface ProductSize {
  id: string;
  productId: string;
  sizeName: string;
  sortOrder: number;
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  sleeve?: number;
  length?: number;
  inseam?: number;
  neck?: number;
  nominalHeight?: number;
  waistAdjustMin?: number;
  waistAdjustMax?: number;
}
export interface FitRule {
  id: string;
  category: ProductCategory;
  measurement: MeasurementType;
  hardMin?: number;
  hardMax?: number;
  idealMin: number;
  idealMax: number;
  acceptableMin: number;
  acceptableMax: number;
  weight: number;
  hardConstraint: boolean;
}
export interface RuleSet {
  id: string;
  category: ProductCategory;
  rules: FitRule[];
}
export interface GrowthRule {
  gender: Gender;
  schoolStage: SchoolStage;
  productCategory: ProductCategory;
  targetGrowthMin?: number;
  targetGrowthMax?: number;
  priority: number;
}
export interface BodyInput {
  gender: Gender;
  schoolStage: SchoolStage;
  growthConsideration: boolean;
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  sleeve?: number;
  length?: number;
  inseam?: number;
}
export type FitLevel =
  | "ideal"
  | "good"
  | "caution_small"
  | "caution_large"
  | "ng_small"
  | "ng_large"
  | "not_evaluated";
export interface MeasurementEvaluation {
  measurement: MeasurementType;
  bodyValue?: number;
  garmentValue?: number;
  difference?: number;
  level: FitLevel;
  hardFailure: boolean;
  message: string;
  effectiveWaistMin?: number;
  effectiveWaistMax?: number;
}
export interface SizeEvaluation {
  size: ProductSize;
  eligible: boolean;
  fitScore: number | null;
  measurements: MeasurementEvaluation[];
  hardFailures: string[];
  growthScore?: number;
  growthRoom?: number;
  futureSleeve?: number;
  futureInseam?: number;
  futureLength?: number;
  summary: string;
}
export interface RecommendationResult {
  currentFit: SizeEvaluation | null;
  trialRecommendation: SizeEvaluation | null;
  comparisonCandidates: SizeEvaluation[];
  allSizes: SizeEvaluation[];
  explanation: string;
  warnings: string[];
}
export interface MasterData {
  version: 2;
  schools: School[];
  products: Product[];
  sizes: ProductSize[];
  ruleSets: RuleSet[];
  growthRules: GrowthRule[];
}
