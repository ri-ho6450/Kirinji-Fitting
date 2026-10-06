import { lazy, Suspense, useState } from "react";
import {
  Shirt,
  School,
  User,
  Calculator,
  Table,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import type {
  BodyInput,
  BodyMeasurement,
  Gender,
  MasterData,
  RecommendationResult,
} from "./domain/types";
import {
  categoryLabels,
  requiredFields,
  fieldLabels,
  measurementFields,
} from "./data/fitRules";
import { fittingNotice, recommendSize } from "./logic/recommendSize";
import { downloadJson, loadMaster, saveMaster } from "./utils/storage";
import SizeCard from "./components/SizeCard";
const MasterManager = lazy(() => import("./components/MasterManager"));
export default function App() {
  const [loaded] = useState(loadMaster);
  const [master, setMaster] = useState<MasterData>(loaded.master);
  const [storageError, setStorageError] = useState(loaded.error);
  const [view, setView] = useState<"main" | "tables">("main");
  const [schoolId, setSchoolId] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [productId, setProductId] = useState("");
  const [values, setValues] = useState<
    Partial<Record<BodyMeasurement, string>>
  >({});
  const [stage, setStage] = useState<BodyInput["schoolStage"]>("high_school");
  const [growth, setGrowth] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [all, setAll] = useState(false);
  const available = master.products.filter(
    (p) =>
      p.schoolId === schoolId &&
      p.active &&
      (p.gender === gender || p.gender === "both"),
  );
  const product = available.find((p) => p.id === productId);
  const selectedRules = master.ruleSets.find(
    (r) => r.id === product?.sizeRuleId,
  );
  const fields: BodyMeasurement[] = product
    ? [
        ...new Set<BodyMeasurement>([
          ...requiredFields[product.category],
          ...(selectedRules?.rules.map(
            (r) => measurementFields[r.measurement],
          ) ?? []),
          "weight",
          ...([
            "gakuran",
            "blazer",
            "sailor",
            "sweater",
            "shirt",
            "gym_top",
          ].includes(product.category)
            ? ["length" as const]
            : []),
        ]),
      ]
    : ["height", "weight"];
  const input = (): BodyInput => ({
    gender,
    schoolStage: stage,
    growthConsideration: growth,
    ...Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => [k, Number(v)]),
    ),
  });
  const invalidate = () => setResult(null);
  const persist = (next: MasterData) => {
    saveMaster(next);
    setMaster(next);
    setStorageError("");
    setResult(null);
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-2xl p-3 text-white">
              <Shirt size={26} />
            </div>
            <div>
              <h1 className="font-black text-xl sm:text-2xl tracking-tight">
                Uniform Size <span className="text-blue-600">Pro V2</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                キリンジ ｜ 試着サイズ判定サポート
              </p>
            </div>
          </div>
          <nav className="flex gap-2">
            <button
              className={view === "main" ? "tab active" : "tab"}
              onClick={() => setView("main")}
            >
              <Calculator size={16} />
              サイズ判定
            </button>
            <button
              className={view === "tables" ? "tab active" : "tab"}
              onClick={() => setView("tables")}
            >
              <Table size={16} />
              学校別寸法表
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {storageError && (
          <p role="alert" className="error mb-6">
            {storageError}
          </p>
        )}
        {view === "tables" ? (
          <Suspense
            fallback={<div className="panel">寸法表管理を読み込み中…</div>}
          >
            <MasterManager master={master} onSave={persist} />
          </Suspense>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-blue-600 font-bold text-xs tracking-widest">
                FITTING SUPPORT
              </p>
              <h2 className="text-2xl font-black mt-2">
                最初に試着するサイズを、根拠とともに。
              </h2>
              <p className="muted mt-2">
                学校・商品の製品実寸と身体寸法を比較して、試着候補をご案内します。
              </p>
            </div>
            <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!product) return;
                  setResult(
                    recommendSize(
                      input(),
                      product,
                      master.sizes.filter((s) => s.productId === product.id),
                      master.ruleSets.find((s) => s.id === product.sizeRuleId),
                      master.growthRules,
                    ),
                  );
                }}
              >
                <h3 className="section-title">
                  <School size={20} />
                  条件・採寸入力
                </h3>
                <label className="mt-5">
                  学校
                  <select
                    aria-label="学校"
                    required
                    value={schoolId}
                    onChange={(e) => {
                      setSchoolId(e.target.value);
                      setProductId("");
                      invalidate();
                    }}
                  >
                    <option value="">学校を選択してください</option>
                    {master.schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="mt-5">
                  <legend className="text-sm font-bold mb-2">性別</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(["male", "female"] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={gender === g}
                        className={
                          gender === g
                            ? "select-button selected"
                            : "select-button"
                        }
                        onClick={() => {
                          setGender(g);
                          setProductId("");
                          invalidate();
                        }}
                      >
                        <User size={18} />
                        {g === "male" ? "男子" : "女子"}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-5">
                  対象制服・商品
                  <select
                    aria-label="対象制服・商品"
                    required
                    disabled={!schoolId}
                    value={productId}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      invalidate();
                    }}
                  >
                    <option value="">商品を選択してください</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {product && (
                  <p className="muted mt-2">
                    カテゴリ：{categoryLabels[product.category]} ／ 登録寸法：
                    {
                      master.sizes.filter((s) => s.productId === productId)
                        .length
                    }
                    サイズ
                  </p>
                )}
                <div className="border-t border-slate-100 mt-6 pt-5">
                  <h3 className="font-bold">ヌード寸法</h3>
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-xl p-3 mt-3">
                    身体の実寸（ヌード寸法）を入力してください。袖丈・丈は身体に対して必要な長さです。
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {fields.map((f) => (
                      <label key={f}>
                        {fieldLabels[f]}
                        {product &&
                          (requiredFields[product.category].includes(f) ||
                            selectedRules?.rules.some(
                              (r) =>
                                r.hardConstraint &&
                                measurementFields[r.measurement] === f,
                            )) && <span className="text-rose-500 ml-1">*</span>}
                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            required={
                              !!product &&
                              (requiredFields[product.category].includes(f) ||
                                selectedRules?.rules.some(
                                  (r) =>
                                    r.hardConstraint &&
                                    measurementFields[r.measurement] === f,
                                ))
                            }
                            value={values[f] ?? ""}
                            placeholder="未入力"
                            onChange={(e) => {
                              setValues({ ...values, [f]: e.target.value });
                              invalidate();
                            }}
                            className="pr-10"
                          />
                          <span className="absolute right-3 top-3 text-xs text-slate-400">
                            {f === "weight" ? "kg" : "cm"}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 mt-6 pt-5">
                  <label>
                    学校段階
                    <select
                      aria-label="学校段階"
                      value={stage}
                      onChange={(e) => {
                        setStage(e.target.value as BodyInput["schoolStage"]);
                        invalidate();
                      }}
                    >
                      <option value="elementary">小学校</option>
                      <option value="junior_high">中学校</option>
                      <option value="high_school">高校</option>
                    </select>
                  </label>
                  <label className="check-row mt-4">
                    <input
                      type="checkbox"
                      checked={growth}
                      onChange={(e) => {
                        setGrowth(e.target.checked);
                        invalidate();
                      }}
                    />
                    <TrendingUp size={18} />
                    成長余地を考慮する
                  </label>
                  <p className="muted mt-2">
                    現在のFitが許容範囲内のサイズだけを比較します。身長だけでサイズアップしません。
                  </p>
                </div>
                <button
                  type="submit"
                  className="primary w-full mt-6"
                  disabled={!product}
                >
                  <Calculator size={18} />
                  サイズを判定する
                </button>
                <button
                  type="button"
                  className="secondary w-full mt-3"
                  onClick={() => {
                    setValues({});
                    setResult(null);
                  }}
                >
                  <RotateCcw size={16} />
                  採寸をリセット
                </button>
              </form>
              <div className="space-y-5" aria-live="polite">
                {!result && (
                  <div className="panel text-center py-16">
                    <div className="inline-flex p-5 bg-blue-50 text-blue-500 rounded-full">
                      <Shirt size={40} />
                    </div>
                    <h3 className="text-xl font-bold mt-5">
                      試着候補を確認しましょう
                    </h3>
                    <p className="muted mt-3">
                      学校・商品を選択し、身体寸法を入力してください。
                    </p>
                    <p className="muted mt-2">
                      寸法表が未登録の場合は、確認済み製品実寸を先に登録してください。
                    </p>
                    <button
                      className="secondary mt-5"
                      onClick={() => setView("tables")}
                    >
                      学校別寸法表を開く
                    </button>
                  </div>
                )}
                {result && product && (
                  <>
                    <section className="bg-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-100">
                      <p className="text-blue-100 font-bold">
                        初回試着推奨サイズ
                      </p>
                      <h3 className="text-5xl font-black mt-3">
                        {result.trialRecommendation?.size.sizeName ??
                          "判定できません"}
                      </h3>
                      <div className="mt-5 border-t border-blue-400 pt-4 space-y-2">
                        <p>
                          現在適応サイズ：
                          <strong>
                            {result.currentFit?.size.sizeName ?? "－"}
                          </strong>
                        </p>
                        <p>
                          比較候補：
                          {result.comparisonCandidates
                            .filter(
                              (s) =>
                                s.size.id !==
                                result.trialRecommendation?.size.id,
                            )
                            .map((s) => s.size.sizeName)
                            .join("・") || "追加候補なし"}
                        </p>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-7 mt-5">
                        {result.explanation}
                      </p>
                    </section>
                    {result.warnings.length > 0 && (
                      <div
                        role="alert"
                        className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                      >
                        <ul className="space-y-2 text-sm text-amber-900">
                          {result.warnings.map((w) => (
                            <li key={w}>・{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.comparisonCandidates.length > 0 && (
                      <section className="panel">
                        <h3 className="section-title">部位別評価・比較候補</h3>
                        <div className="grid xl:grid-cols-2 gap-4 mt-5">
                          {result.comparisonCandidates.map((e) => (
                            <SizeCard
                              key={e.size.id}
                              evaluation={e}
                              product={product}
                              title={
                                e.size.id ===
                                result.trialRecommendation?.size.id
                                  ? e.size.id === result.currentFit?.size.id
                                    ? "初回試着推奨 ／ 現在適応"
                                    : "初回試着推奨"
                                  : e.size.id === result.currentFit?.size.id
                                    ? "現在適応"
                                    : "比較候補"
                              }
                            />
                          ))}
                        </div>
                      </section>
                    )}
                    <section className="panel">
                      <h3 className="section-title">試着時の確認ポイント</h3>
                      <p className="muted mt-3">
                        {["slacks", "skirt", "gym_bottom"].includes(
                          product.category,
                        )
                          ? "ウエストを調整し、座った時のヒップのつっぱり、歩行時の動きやすさ、裾・丈をご確認ください。"
                          : "前を閉じた胸まわり、腕を動かした時の肩のつっぱり、手首の袖丈、着丈と重ね着時の着用感をご確認ください。"}
                      </p>
                      <button
                        className="secondary mt-4"
                        onClick={() =>
                          downloadJson(
                            {
                              version: 2,
                              measuredAt: new Date().toISOString(),
                              input: input(),
                              product,
                              result,
                            },
                            "kirinji-fitting-record.json",
                          )
                        }
                      >
                        採寸・判定記録を書き出す
                      </button>
                      <p className="muted mt-2">
                        体重を含む入力と判定結果を保存できます。個人情報を含む記録は適切に管理してください。
                      </p>
                    </section>
                    {result.allSizes.length > 0 && (
                      <section className="panel">
                        <button
                          className="w-full flex justify-between font-bold"
                          aria-expanded={all}
                          onClick={() => setAll(!all)}
                        >
                          全サイズ比較（{result.allSizes.length}サイズ）
                          <span>{all ? "－ 閉じる" : "＋ 開く"}</span>
                        </button>
                        {all && (
                          <div className="grid xl:grid-cols-2 gap-4 mt-5">
                            {result.allSizes.map((e) => (
                              <SizeCard
                                key={e.size.id}
                                evaluation={e}
                                product={product}
                                title={
                                  !e.eligible
                                    ? "候補外"
                                    : e.size.id ===
                                        result.trialRecommendation?.size.id
                                      ? "初回試着推奨"
                                      : e.size.id === result.currentFit?.size.id
                                        ? "現在適応"
                                        : "HARD条件通過"
                                }
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}
                <aside className="border border-slate-200 rounded-2xl bg-white p-5 text-sm text-slate-600 leading-7">
                  {fittingNotice}
                </aside>
              </div>
            </div>
          </>
        )}
      </main>
      <footer className="text-center text-xs text-slate-400 px-4 py-6">
        KIRINJI · Uniform Size Pro V2 · 試着前の初期判断をサポート
      </footer>
    </div>
  );
}
