import type { ProductSize } from "../domain/types";
const columns: Record<string, keyof ProductSize> = {
  sizeName: "sizeName",
  サイズ: "sizeName",
  サイズ名: "sizeName",
  chest: "chest",
  胸囲: "chest",
  バスト: "chest",
  waist: "waist",
  ウエスト: "waist",
  hip: "hip",
  ヒップ: "hip",
  shoulder: "shoulder",
  肩幅: "shoulder",
  sleeve: "sleeve",
  袖丈: "sleeve",
  length: "length",
  着丈: "length",
  丈: "length",
  inseam: "inseam",
  股下: "inseam",
  nominalHeight: "nominalHeight",
  呼称身長: "nominalHeight",
  waistAdjustMin: "waistAdjustMin",
  調整最小: "waistAdjustMin",
  waistAdjustMax: "waistAdjustMax",
  調整最大: "waistAdjustMax",
};
// 明示的なヘッダーを持つ行形式のみ。身幅の倍算や数値の推測はしない。
export function importTable(text: string, productId: string): ProductSize[] {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .filter((x) => x.trim())
    .map((line) =>
      line
        .trim()
        .split(/\t|,/)
        .map((x) => x.trim()),
    );
  if (rows.length < 2)
    throw new Error(
      "ヘッダーと1行以上の寸法データが必要です（CSV／タブ区切り）",
    );
  const keys = rows[0].map((h) => columns[h]);
  if (
    !keys.includes("sizeName") ||
    keys.some((k) => !k) ||
    new Set(keys).size !== keys.length
  )
    throw new Error(
      "サイズ名・寸法の列名をご確認ください。未知の列や重複列は取り込めません",
    );
  return rows.slice(1).map((row, i) => {
    if (row.length !== keys.length)
      throw new Error(`${i + 2}行目の列数が一致しません`);
    const size: ProductSize = {
      id: `${productId}-size-${i + 1}`,
      productId,
      sizeName: "",
      sortOrder: i + 1,
    };
    row.forEach((v, j) => {
      const k = keys[j];
      if (k === "sizeName") size.sizeName = v;
      else if (v !== "") {
        const n = Number(v);
        if (!Number.isFinite(n))
          throw new Error(`${i + 2}行目に不正な数値があります`);
        (size as unknown as Record<string, unknown>)[k] = n;
      }
    });
    return size;
  });
}
