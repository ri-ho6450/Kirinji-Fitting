import { test } from "node:test";
import assert from "node:assert/strict";
import { input, product, sizes } from "./fixtures";
import { fitRuleSets } from "../src/data/fitRules";
import { growthRules } from "../src/data/growthRules";
import { recommendSize } from "../src/logic/recommendSize";
import { evaluateMeasurement } from "../src/logic/evaluateMeasurement";
import { validateMaster } from "../src/logic/validate";
import { initialMaster } from "../src/utils/storage";
import { importTable } from "../src/utils/importTable";
import type { BodyInput, Product, ProductSize } from "../src/domain/types";
const set = fitRuleSets.find((r) => r.id === product.sizeRuleId)!;
const run = (body: BodyInput = input, table: ProductSize[] = sizes) =>
  recommendSize(body, product, table, set, growthRules);
test("Case 1: 160A current fit, 165A trial with growth", () => {
  const r = run();
  assert.equal(r.currentFit?.size.sizeName, "160A");
  assert.equal(r.trialRecommendation?.size.sizeName, "165A");
  assert.equal(r.allSizes.length, 3);
});
test("Case 2: 170A long sleeve excluded despite growth room", () => {
  const r = run();
  const e = r.allSizes.find((s) => s.size.sizeName === "170A")!;
  assert.equal(e.eligible, false);
  assert.equal(e.fitScore, null);
  assert.ok(e.hardFailures.some((m) => m.includes("袖丈")));
  assert.equal(r.trialRecommendation?.size.sizeName, "165A");
});
test("Case 3: chest hard failure excludes 160A", () => {
  const r = run(
    input,
    sizes.map((s, i) => (i === 0 ? { ...s, chest: 92 } : s)),
  );
  assert.equal(r.allSizes[0].eligible, false);
  assert.equal(r.currentFit?.size.sizeName, "165A");
});
test("Case 4: shoulder hard failure cannot be offset by high scores", () => {
  const r = run(
    input,
    sizes.map((s, i) => (i === 0 ? { ...s, shoulder: 39.9 } : s)),
  );
  assert.equal(r.allSizes[0].eligible, false);
  assert.equal(r.allSizes[0].fitScore, null);
  assert.notEqual(r.currentFit?.size.sizeName, "160A");
});
test("Case 5: all hard failure returns no recommendation", () => {
  const r = run({ ...input, chest: 120 });
  assert.equal(r.trialRecommendation, null);
  assert.equal(r.currentFit, null);
  assert.match(r.explanation, /推奨サイズを判定できません/);
  assert.equal(r.allSizes.length, 3);
});
test("Case 6: no automatic size up from 165A", () => {
  const r = run({ ...input, chest: 81, shoulder: 41, sleeve: 58, length: 67 });
  assert.equal(r.currentFit?.size.sizeName, "165A");
  assert.equal(r.trialRecommendation?.size.sizeName, "165A");
});
test("growth disabled preserves current fit and comparisons are unique", () => {
  const r = run({ ...input, growthConsideration: false });
  assert.equal(r.trialRecommendation?.size.sizeName, "160A");
  assert.equal(
    new Set(r.comparisonCandidates.map((s) => s.size.id)).size,
    r.comparisonCandidates.length,
  );
});
test("missing body, table, rule or mixed products never recommend", () => {
  assert.equal(
    run({ ...input, shoulder: undefined }).trialRecommendation,
    null,
  );
  assert.equal(run(input, []).trialRecommendation, null);
  assert.equal(
    recommendSize(input, product, sizes, undefined, growthRules)
      .trialRecommendation,
    null,
  );
  assert.equal(
    run(input, [{ ...sizes[0], productId: "other" }]).trialRecommendation,
    null,
  );
});
test("missing hard garment dimensions and contradictory data block recommendation", () => {
  assert.equal(
    run(input, [{ ...sizes[0], shoulder: undefined }]).trialRecommendation,
    null,
  );
  assert.equal(
    run(input, [{ ...sizes[0], chest: NaN }]).trialRecommendation,
    null,
  );
  assert.equal(
    run(input, [sizes[0], { ...sizes[1], sizeName: "160A" }])
      .trialRecommendation,
    null,
  );
  assert.equal(run({ ...input, height: -1 }).trialRecommendation, null);
});
test("continuous chest boundaries including decimals", () => {
  const rule = set.rules.find((r) => r.measurement === "chest_ease")!;
  for (const [diff, level] of [
    [14.99, "ng_small"],
    [15, "caution_small"],
    [19.99, "caution_small"],
    [20, "good"],
    [23.99, "good"],
    [24, "ideal"],
    [28, "ideal"],
    [28.01, "caution_large"],
    [32, "caution_large"],
    [32.01, "ng_large"],
  ] as const) {
    assert.equal(
      evaluateMeasurement(
        input,
        product,
        { ...sizes[0], chest: input.chest! + diff },
        rule,
      ).level,
      level,
      `ease ${diff}`,
    );
  }
});
test("shoulder <0 fails, zero is good; future sleeve cannot rescue current shortage", () => {
  const r = set.rules.find((r) => r.measurement === "shoulder_ease")!;
  assert.equal(
    evaluateMeasurement(input, product, { ...sizes[0], shoulder: 40 }, r).level,
    "good",
  );
  assert.equal(
    evaluateMeasurement(input, product, { ...sizes[0], shoulder: 39.99 }, r)
      .hardFailure,
    true,
  );
  const result = run(input, [{ ...sizes[0], sleeve: 53 }]);
  assert.equal(result.trialRecommendation, null);
  assert.equal(result.allSizes[0].futureSleeve, 56);
});
const slacks: Product = {
  ...product,
  id: "pants",
  category: "slacks",
  sizeRuleId: "default-slacks",
  waistAdjustMin: -3,
  waistAdjustMax: 3,
  hemExtendable: 3,
};
const pants: ProductSize = {
  id: "pants70",
  productId: "pants",
  sizeName: "70",
  sortOrder: 1,
  waist: 70,
  hip: 96,
  inseam: 73,
};
const bottomBody: BodyInput = { ...input, waist: 70, hip: 88, inseam: 72 };
const bottomRun = (body = bottomBody, p = slacks, s = pants) =>
  recommendSize(
    body,
    p,
    [s],
    fitRuleSets.find((r) => r.id === p.sizeRuleId),
    growthRules,
  );
test("slacks waist adjustment range inclusive and row overrides product", () => {
  for (const waist of [67, 70, 73])
    assert.equal(
      bottomRun({ ...bottomBody, waist }).currentFit?.eligible,
      true,
    );
  for (const waist of [66.9, 73.1])
    assert.equal(bottomRun({ ...bottomBody, waist }).trialRecommendation, null);
  assert.equal(
    bottomRun({ ...bottomBody, waist: 73 }, slacks, {
      ...pants,
      waistAdjustMin: -1,
      waistAdjustMax: 1,
    }).trialRecommendation,
    null,
  );
});
test("skirt hip hard failure overrides fitting waist", () => {
  const p: Product = {
    ...slacks,
    category: "skirt",
    sizeRuleId: "default-skirt",
  };
  assert.equal(
    bottomRun({ ...bottomBody, hip: 94, length: 50 }, p, {
      ...pants,
      length: 51,
    }).trialRecommendation,
    null,
  );
});
test("growth search never accepts an excessive currently wearable candidate", () => {
  const r = run(
    input,
    sizes.map((s, i) => (i === 1 ? { ...s, sleeve: 61 } : s)),
  );
  assert.equal(r.allSizes[1].eligible, true);
  assert.equal(r.trialRecommendation?.size.sizeName, "160A");
});
test("unknown growth rule does not invent a size-up", () => {
  const r = run({ ...input, schoolStage: "high_school" });
  assert.equal(r.trialRecommendation?.size.sizeName, "160A");
  assert.ok(r.warnings.some((w) => w.includes("成長ルール")));
});
test("optional measurements are not evaluated; scores renormalize", () => {
  const r = run(
    { ...input, length: undefined },
    sizes.map((s) => ({ ...s, nominalHeight: undefined })),
  );
  assert.equal(r.currentFit?.size.sizeName, "160A");
  assert.ok(
    r.currentFit?.measurements.some((m) => m.level === "not_evaluated"),
  );
  assert.equal(r.currentFit?.fitScore, 100);
});
test("rule master actually changes evaluation", () => {
  const modified = {
    ...set,
    rules: set.rules.map((r) =>
      r.measurement === "chest_ease"
        ? { ...r, hardMin: 30, acceptableMin: 30, idealMin: 30, idealMax: 31 }
        : r,
    ),
  };
  const r = recommendSize(input, product, sizes, modified, growthRules);
  assert.equal(r.allSizes[0].eligible, false);
});
test("CSV imports only explicit dimensions, preserves empty columns, rejects guessing", () => {
  const t = importTable("サイズ名,胸囲,肩幅,袖丈\n160A,104,,57", product.id);
  assert.equal(t[0].shoulder, undefined);
  assert.equal(t[0].sleeve, 57);
  assert.throws(() => importTable("サイズ名,身幅\n160A,52", product.id));
  assert.throws(() => importTable("サイズ名,胸囲\n160A,no", product.id));
});
test("V2 master validation rejects invalid references and preserves empty tables", () => {
  validateMaster(initialMaster());
  const m = initialMaster();
  m.products[0].schoolId = "unknown";
  assert.throws(() => validateMaster(m));
  const bad = initialMaster();
  bad.ruleSets[0].rules[0].idealMin = 999;
  assert.throws(() => validateMaster(bad));
});
test("nominal height alone never triggers growth upsize", () => {
  const r = run(input, [
    sizes[0],
    {
      ...sizes[0],
      id: "same",
      sizeName: "165A",
      sortOrder: 2,
      nominalHeight: 165,
    },
  ]);
  assert.equal(r.trialRecommendation?.size.sizeName, "160A");
});
test("no current acceptable fit yields null trial even if hard conditions pass", () => {
  const r = run(input, [{ ...sizes[0], chest: 96 }]);
  assert.equal(r.currentFit?.eligible, true);
  assert.equal(r.trialRecommendation, null);
  assert.match(r.explanation, /推奨サイズを判定できません/);
});

test("transposed PDF table imports both standard and B sizes with male classification", () => {
  const table =
    "件名\t誠英高校\n品名\t男子ブレザー・S2ツ釦\nサイズ\t3S\tSS\tS\tM\tL\tLL\t3L\n胸囲\t94.5\t99\t103.5\t108\t112.5\t117\t121.5\n肩巾\t40\t41.5\t43\t44.5\t46\t47.5\t49\n着丈\t63\t66\t69\t72\t75\t78\t81\n袖丈\t55\t57\t59\t61\t63\t65\t67\nサイズ\tB3S\tBSS\tBS\tBM\tBL\tBLL\tB3L\n胸囲\t102.5\t107\t111.5\t116\t120.5\t125\t129.5\n肩巾\t42.5\t44\t45.5\t47\t48.5\t50\t51.5\n着丈\t64\t67\t70\t73\t76\t79\t82\n袖丈\t56\t58\t60\t62\t64\t66\t68";
  const imported = importTable(table, "jacket", "male");
  assert.equal(imported.length, 14);
  assert.equal(imported[0].chest, 94.5);
  assert.equal(imported[13].shoulder, 51.5);
  assert.equal(imported[13].sleeve, 68);
  assert.ok(imported.every((s) => s.gender === "male"));
  assert.ok(imported.every((s) => s.nominalHeight === undefined));
  assert.throws(() => importTable(table, "jacket", "female"));
});
test("CSV gender column requires consistent matching destination; legacy CSV inherits selected gender", () => {
  assert.equal(
    importTable("サイズ名,性別,胸囲\nS,女子,98", "female", "female")[0].gender,
    "female",
  );
  assert.throws(() =>
    importTable("サイズ名,性別,胸囲\nS,女子,98", "male", "male"),
  );
  assert.throws(() =>
    importTable("サイズ名,性別,胸囲\nS,男子,98\nM,女子,100", "mixed"),
  );
  assert.equal(
    importTable("サイズ名,胸囲\nS,98", "old", "male")[0].gender,
    "male",
  );
});
test("garment gender mismatch cannot enter recommendation engine", () => {
  assert.equal(
    run(
      input,
      sizes.map((s) => ({ ...s, gender: "female" })),
    ).trialRecommendation,
    null,
  );
});
test("transposed PDF missing cells and repeated measurements are rejected", () => {
  assert.throws(() => importTable("サイズ\tS\tM\n胸囲\t98", "p", "male"));
  assert.throws(() =>
    importTable("サイズ\tS\n胸囲\t98\n胸囲\t99", "p", "male"),
  );
});
