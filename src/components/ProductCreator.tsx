import { useState } from "react";
import type {
  MasterData,
  Product,
  ProductCategory,
  RuleSet,
} from "../domain/types";
import { categoryLabels, fitRuleSets } from "../data/fitRules";
import { genderLabels } from "../utils/importTable";
export default function ProductCreator({
  master,
  schoolId,
  onCreate,
  disabled = false,
}: {
  master: MasterData;
  schoolId: string;
  onCreate: (product: Product, rule: RuleSet) => void;
  disabled?: boolean;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Product["gender"]>("male");
  const [category, setCategory] = useState<ProductCategory>("blazer");
  const [manufacturer, setManufacturer] = useState("");
  const [code, setCode] = useState("");
  const [basis, setBasis] = useState("default-blazer");
  const [error, setError] = useState("");
  const rules = [
    ...master.ruleSets,
    ...fitRuleSets.filter((s) => !master.ruleSets.some((x) => x.id === s.id)),
  ];
  return (
    <details className="mt-5 border border-blue-100 bg-blue-50/40 rounded-2xl p-4">
      <summary className="cursor-pointer font-bold text-blue-700">
        ＋ この学校に商品を追加
      </summary>
      <fieldset disabled={disabled}>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <label>
          追加する商品名
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：冬セーラー服、Vネックセーター"
          />
        </label>
        <label>
          追加商品の男女区分
          <select
            aria-label="追加商品の男女区分"
            value={gender}
            onChange={(e) => setGender(e.target.value as Product["gender"])}
          >
            {Object.entries(genderLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          追加商品のカテゴリ
          <select
            aria-label="追加商品のカテゴリ"
            value={category}
            onChange={(e) => {
              const c = e.target.value as ProductCategory;
              setCategory(c);
              setBasis(
                rules.find((r) => r.category === c)?.id ?? "default-blazer",
              );
            }}
          >
            {Object.entries(categoryLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          判定基準
          <select
            aria-label="追加商品の判定基準"
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
          >
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {categoryLabels[r.category]} ／ {r.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          メーカー（任意）
          <input
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
        </label>
        <label>
          品番（任意）
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
      </div>
      <p className="muted mt-3">
        商品名は自由に登録できます。男女で実寸が異なる場合は、男子・女子を別商品にしてください。セーラー服・セーターの初期基準は上衣の暫定値です。商品の特性に合わせ、試着検証・ルール調整してください。「その他」は選んだ基準を複製して使用します。
      </p>
      {error && (
        <p role="alert" className="error mt-3">
          {error}
        </p>
      )}
      <button
        type="button"
        className="primary mt-4"
        disabled={!schoolId}
        onClick={() => {
          try {
            if (!name.trim()) throw new Error("商品名を入力してください");
            if (
              master.products.some(
                (p) =>
                  p.schoolId === schoolId &&
                  p.gender === gender &&
                  p.name.trim() === name.trim(),
              )
            )
              throw new Error("同じ学校・男女区分・商品名が登録済みです");
            const base = rules.find((r) => r.id === basis);
            if (!base) throw new Error("判定基準を選択してください");
            const id = crypto.randomUUID();
            const rule =
              base.category === category
                ? structuredClone(base)
                : {
                    ...structuredClone(base),
                    id: `product-rule-${id}`,
                    category,
                    rules: base.rules.map((r) => ({
                      ...r,
                      id: `${id}-${r.measurement}`,
                      category,
                    })),
                  };
            const product: Product = {
              id,
              schoolId,
              name: name.trim(),
              gender,
              category,
              manufacturer: manufacturer.trim() || undefined,
              productCode: code.trim() || undefined,
              sizeRuleId: rule.id,
              active: true,
            };
            onCreate(product, rule);
            setName("");
            setCode("");
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        商品を追加して寸法登録へ
      </button>
      </fieldset>
    </details>
  );
}
