import type { Product, SizeEvaluation } from "../domain/types";
import { fieldLabels, fitLabels, measurementFields } from "../data/fitRules";
export default function SizeCard({
  evaluation: e,
  product,
  title,
}: {
  evaluation: SizeEvaluation;
  product: Product;
  title?: string;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 ${e.eligible ? "border-blue-100 bg-blue-50/40" : "border-rose-200 bg-rose-50/40"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-blue-600">
            {title ?? (e.eligible ? "比較候補" : "候補外")}
          </p>
          <h3 className="text-2xl font-black">{e.size.sizeName}</h3>
        </div>
        <span className="text-sm font-bold">
          Fit {e.fitScore === null ? "－（HARD NG）" : `${e.fitScore} / 100`}
        </span>
      </div>
      <dl className="mt-4 space-y-3">
        {e.measurements.map((m) => (
          <div key={m.measurement}>
            <div className="flex justify-between gap-3 text-sm">
              <dt>{fieldLabels[measurementFields[m.measurement]]}</dt>
              <dd
                className={
                  m.hardFailure ? "font-bold text-rose-700" : "font-bold"
                }
              >
                {fitLabels[m.level]}
              </dd>
            </div>
            <p className="mt-1 text-xs text-slate-500">{m.message}</p>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-slate-200 pt-3 text-sm space-y-1">
        <p>
          成長余地：
          {e.growthRoom === undefined
            ? "－ 評価なし"
            : `${e.growthRoom}cm（呼称身長差・予測ではありません）`}
        </p>
        {e.futureSleeve !== undefined && (
          <p>
            袖出し余裕：+{product.sleeveExtendable ?? 0}cm ／ 袖出し後{" "}
            {e.futureSleeve}cm ／ 身体必要袖丈との差{" "}
            {Number(
              (
                e.futureSleeve -
                (e.measurements.find((m) => m.measurement === "sleeve_diff")
                  ?.bodyValue ?? e.futureSleeve)
              ).toFixed(1),
            )}
            cm
          </p>
        )}
        {e.futureInseam !== undefined && (
          <p>
            裾出し余裕：+{product.hemExtendable ?? 0}cm ／ 裾出し後{" "}
            {e.futureInseam}cm
          </p>
        )}
        {e.futureLength !== undefined && (
          <p>
            裾出し余裕：+{product.hemExtendable ?? 0}cm ／ 裾出し後の丈{" "}
            {e.futureLength}cm
          </p>
        )}
      </div>
      {!e.eligible && <p className="mt-3 text-xs text-rose-700">{e.summary}</p>}
    </article>
  );
}
