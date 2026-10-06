import type { ProductSize } from "../domain/types";
// 学校・商品ごとの製品実寸は確認・登録されるまで空。共通寸法へのフォールバックは禁止。
export const sizes: ProductSize[] = [];
