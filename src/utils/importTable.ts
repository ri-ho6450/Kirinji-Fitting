import type { Product, ProductSize } from "../domain/types";
type ImportKey = keyof ProductSize;
const columns: Record<string, ImportKey> = {
  sizeName: "sizeName",
  サイズ: "sizeName",
  サイズ名: "sizeName",
  gender: "gender",
  性別: "gender",
  男女区分: "gender",
  chest: "chest",
  胸囲: "chest",
  バスト: "chest",
  waist: "waist",
  ウエスト: "waist",
  hip: "hip",
  ヒップ: "hip",
  shoulder: "shoulder",
  肩幅: "shoulder",
  肩巾: "shoulder",
  sleeve: "sleeve",
  袖丈: "sleeve",
  length: "length",
  着丈: "length",
  丈: "length",
  inseam: "inseam",
  股下: "inseam",
  neck: "neck",
  首囲: "neck",
  nominalHeight: "nominalHeight",
  呼称身長: "nominalHeight",
  waistAdjustMin: "waistAdjustMin",
  調整最小: "waistAdjustMin",
  waistAdjustMax: "waistAdjustMax",
  調整最大: "waistAdjustMax",
};
export const genderLabels = { male: "男子", female: "女子", both: "男女共通" };
export function parseGender(value: string): Product["gender"] {
  const normalized = value.trim().normalize("NFKC").toLowerCase();
  if (["male", "男子", "男", "男性"].includes(normalized)) return "male";
  if (["female", "女子", "女", "女性"].includes(normalized)) return "female";
  if (["both", "男女共通", "男女兼用", "共通"].includes(normalized))
    return "both";
  throw new Error(
    `性別「${value}」を認識できません。男子・女子・男女共通を指定してください`,
  );
}
export function declaredGender(text: string): Product["gender"] | undefined {
  const preamble = text.split(/(?:サイズ|sizeName)/)[0];
  if (/男女共通|男女兼用/.test(preamble)) return "both";
  const male = /男子|男性/.test(preamble),
    female = /女子|女性/.test(preamble);
  if (male && female)
    throw new Error(
      "男女の表が混在しています。男女別の商品へ分けて取り込んでください",
    );
  return male ? "male" : female ? "female" : undefined;
}
function splitRow(line: string): string[] {
  return line.includes(",") || line.includes("\t")
    ? line.split(/\t|,/).map((x) => x.trim())
    : line.trim().split(/\s+/);
}
function putValue(size: ProductSize, key: ImportKey, value: string) {
  if (key === "sizeName") {
    size.sizeName = value;
    return;
  }
  if (key === "gender") {
    size.gender = parseGender(value);
    return;
  }
  if (value === "") return;
  const n = Number(value.normalize("NFKC"));
  if (!Number.isFinite(n))
    throw new Error(
      `${size.sizeName || "サイズ行"}の寸法「${value}」が不正です`,
    );
  (size as unknown as Record<string, unknown>)[key] = n;
}
// 明示的な列名・項目名のみ使用。身幅から胸囲への換算や呼称身長の推測はしない。
export function importTable(
  text: string,
  productId: string,
  expectedGender?: Product["gender"],
): ProductSize[] {
  const raw = text
    .trim()
    .split(/\r?\n/)
    .filter((x) => x.trim());
  const first = raw.findIndex(
    (line) => columns[splitRow(line)[0]] === "sizeName",
  );
  if (first < 0)
    throw new Error(
      "サイズ名のヘッダーがありません。CSV／タブ区切り、またはサイズが横並びの寸法表を指定してください",
    );
  const rows = raw.slice(first).map(splitRow);
  if (rows.length < 2)
    throw new Error("ヘッダーと1行以上の寸法データが必要です");
  const keys = rows[0].map((h) => columns[h]);
  let sizes: ProductSize[];
  if (keys.every(Boolean)) {
    if (new Set(keys).size !== keys.length)
      throw new Error("寸法の列名が重複しています");
    sizes = rows.slice(1).map((row, i) => {
      if (row.length !== keys.length)
        throw new Error(`${i + 2}行目の列数が一致しません`);
      const size: ProductSize = {
        id: `${productId}-size-${i + 1}`,
        productId,
        sizeName: "",
        sortOrder: i + 1,
      };
      row.forEach((value, j) => putValue(size, keys[j], value));
      return size;
    });
  } else {
    sizes = [];
    let block: ProductSize[] = [];
    let seen = new Set<string>();
    for (const row of rows) {
      const key = columns[row[0]];
      if (key === "sizeName") {
        if (row.length < 2 || row.slice(1).some((s) => !s))
          throw new Error("サイズ名が欠けています");
        block = row.slice(1).map((name) => {
          const order = sizes.length + 1;
          const size: ProductSize = {
            id: `${productId}-size-${order}`,
            productId,
            sizeName: name,
            sortOrder: order,
          };
          sizes.push(size);
          return size;
        });
        seen = new Set();
      } else {
        if (!key)
          throw new Error(
            `寸法項目「${row[0]}」を認識できません。表以外の説明行を除いてください`,
          );
        if (seen.has(key))
          throw new Error(`寸法項目「${row[0]}」が重複しています`);
        if (row.length !== block.length + 1)
          throw new Error(`${row[0]}の列数とサイズ数が一致しません`);
        seen.add(key);
        block.forEach((size, i) => putValue(size, key, row[i + 1]));
      }
    }
  }
  const declared = declaredGender(text);
  for (const size of sizes) {
    if (!size.sizeName.trim()) throw new Error("サイズ名が空です");
    if (expectedGender && size.gender && size.gender !== expectedGender)
      throw new Error(
        "取込データと選択した男女区分が一致しません。男女別の商品に取り込んでください",
      );
    if (
      declared &&
      (size.gender ?? expectedGender) &&
      declared !== (size.gender ?? expectedGender)
    )
      throw new Error("PDFに明記された男女区分と取込先が一致しません");
    size.gender ??= declared ?? expectedGender;
  }
  if (new Set(sizes.map((s) => s.gender)).size > 1)
    throw new Error(
      "男女の寸法が混在しています。男女別の商品に取り込んでください",
    );
  if (new Set(sizes.map((s) => s.sizeName)).size !== sizes.length)
    throw new Error("サイズ名が重複しています");
  return sizes;
}
