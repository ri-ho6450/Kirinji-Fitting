import { useEffect, useState } from "react";
import type { MasterData, ProductSize } from "../domain/types";
import {
  categoryLabels,
  fieldLabels,
  measurementFields,
} from "../data/fitRules";
import { validateMaster, validateSizes } from "../logic/validate";
import { importTable } from "../utils/importTable";
import { downloadJson } from "../utils/storage";
import { extractPdfText, loadPdfSource, savePdfSource } from "../utils/pdf";
import PdfCanvasViewer from "./PdfCanvasViewer";
const numericFields = [
  "chest",
  "waist",
  "hip",
  "shoulder",
  "sleeve",
  "length",
  "inseam",
  "nominalHeight",
  "waistAdjustMin",
  "waistAdjustMax",
] as const;
const labels = {
  chest: "胸囲",
  waist: "ウエスト",
  hip: "ヒップ",
  shoulder: "肩幅",
  sleeve: "袖丈",
  length: "着丈／丈",
  inseam: "股下",
  nominalHeight: "呼称身長",
  waistAdjustMin: "調整最小（差分）",
  waistAdjustMax: "調整最大（差分）",
};
export default function MasterManager({
  master,
  onSave,
}: {
  master: MasterData;
  onSave: (m: MasterData) => void;
}) {
  const [schoolId, setSchoolId] = useState(master.schools[0]?.id ?? "");
  const [productId, setProductId] = useState("");
  const product = master.products.find(
    (p) => p.id === productId && p.schoolId === schoolId,
  );
  const [draft, setDraft] = useState<ProductSize[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [fullJson, setFullJson] = useState("");
  const [fullConfirmed, setFullConfirmed] = useState(false);
  const [pdf, setPdf] = useState<File | Blob>();
  const [pdfName, setPdfName] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setFullJson(JSON.stringify(master, null, 2));
    setFullConfirmed(false);
  }, [master]);
  useEffect(() => {
    setText("");
    setError("");
    setMessage("");
    setPdf(undefined);
    setPdfName("");
    let active = true;
    if (productId)
      loadPdfSource(productId)
        .then((source) => {
          if (active && source) {
            setPdf(source.file);
            setPdfName(source.name);
          }
        })
        .catch(() => {
          if (active)
            setError(
              "PDF原本を読み込めません。寸法マスタの判定は利用できます。",
            );
        });
    return () => {
      active = false;
    };
  }, [productId]);
  useEffect(() => {
    setDraft(master.sizes.filter((s) => s.productId === productId));
    setConfirmed(false);
  }, [productId, master]);
  useEffect(() => {
    if (!pdf) {
      setPdfUrl("");
      return;
    }
    const url = URL.createObjectURL(pdf);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf]);
  const changeDraft = (next: ProductSize[]) => {
    setDraft(next);
    setConfirmed(false);
    setMessage("");
  };
  const save = () => {
    try {
      if (!product || !confirmed) throw new Error("製品実寸を確認してください");
      const set = master.ruleSets.find((r) => r.id === product.sizeRuleId)!;
      const errors = validateSizes(product, draft, set);
      if (errors.length) throw new Error(errors.join("／"));
      onSave({
        ...master,
        sizes: [
          ...master.sizes.filter((s) => s.productId !== product.id),
          ...draft,
        ],
      });
      setMessage("確認済みサイズマスタを保存しました。");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        setPdf(file);
        setPdfName(file.name);
        setText(await extractPdfText(file));
        setMessage(
          "PDF抽出結果は仮データです。列名・数値を確認し、表に取り込んでください。",
        );
      } else {
        setText(await file.text());
      }
      setConfirmed(false);
    } catch {
      setError(
        "PDFの抽出に失敗しました。原本を確認し、寸法を手入力できます。判定本体には影響しません。",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="section-title">学校別寸法表</h2>
        <p className="muted">
          製品実寸の単位はcmです。PDFは原本・確認資料、判定の正本は確認後に保存したサイズマスタです。
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-5">
          <label>
            学校
            <select
              disabled={busy}
              aria-label="学校"
              value={schoolId}
              onChange={(e) => {
                setSchoolId(e.target.value);
                setProductId("");
              }}
            >
              {master.schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            商品
            <select
              disabled={busy}
              aria-label="商品"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">商品を選択</option>
              {master.products
                .filter((p) => p.schoolId === schoolId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ／ {categoryLabels[p.category]}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {product && (
          <>
            <p className="mt-4 text-sm">
              保存済み：
              {master.sizes.filter((s) => s.productId === productId).length}
              サイズ ／ メーカー：{product.manufacturer || "未登録"} ／ 品番：
              {product.productCode || "未登録"}
            </p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <label>
                PDF／CSV／テキストを読み込み（仮データ）
                <input
                  type="file"
                  accept=".pdf,.csv,.txt"
                  disabled={busy}
                  onChange={(e) => {
                    void readFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="muted">
                CSV列例：サイズ名,胸囲,肩幅,袖丈,着丈,呼称身長。身幅と胸囲は別の寸法です。自動換算は行いません。
              </p>
              <textarea
                aria-label="取り込み用寸法テキスト"
                rows={5}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setConfirmed(false);
                }}
                placeholder="サイズ名,胸囲,肩幅,袖丈,着丈,呼称身長"
              />
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  try {
                    changeDraft(importTable(text, product.id));
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                表に取り込んで確認
              </button>
            </div>
            <div className="overflow-x-auto mt-5">
              <table className="dimension-table">
                <caption className="text-left font-bold py-2">
                  確認用編集表（保存前の仮データ）
                </caption>
                <thead>
                  <tr>
                    <th>サイズ名</th>
                    <th>順序</th>
                    {numericFields.map((f) => (
                      <th key={f}>{labels[f]}</th>
                    ))}
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.map((s, i) => (
                    <tr key={s.id}>
                      <td>
                        <input
                          aria-label={`サイズ名 ${i + 1}`}
                          value={s.sizeName}
                          onChange={(e) =>
                            changeDraft(
                              draft.map((x, j) =>
                                j === i
                                  ? { ...x, sizeName: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`順序 ${i + 1}`}
                          type="number"
                          value={s.sortOrder}
                          onChange={(e) =>
                            changeDraft(
                              draft.map((x, j) =>
                                j === i
                                  ? { ...x, sortOrder: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      {numericFields.map((f) => (
                        <td key={f}>
                          <input
                            aria-label={`${labels[f]} ${i + 1}`}
                            type="number"
                            step="0.1"
                            value={s[f] ?? ""}
                            onChange={(e) =>
                              changeDraft(
                                draft.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        [f]:
                                          e.target.value === ""
                                            ? undefined
                                            : Number(e.target.value),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          className="text-rose-600"
                          onClick={() =>
                            changeDraft(draft.filter((_, j) => i !== j))
                          }
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="secondary mt-3"
              onClick={() =>
                changeDraft([
                  ...draft,
                  {
                    id: crypto.randomUUID(),
                    productId: product.id,
                    sizeName: "",
                    sortOrder:
                      Math.max(0, ...draft.map((s) => s.sortOrder)) + 1,
                  },
                ])
              }
            >
              ＋ サイズを追加
            </button>
            <label className="check-row mt-5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              原本と照合し、サイズ名・製品実寸・調整範囲を確認しました
            </label>
            <div className="flex flex-wrap gap-3 mt-3">
              <button
                className="primary"
                disabled={!confirmed || busy}
                onClick={save}
              >
                確認済みマスタを保存
              </button>
              <button
                className="secondary"
                onClick={() => {
                  changeDraft(
                    master.sizes.filter((s) => s.productId === productId),
                  );
                  setError("");
                }}
              >
                保存済み表に戻す
              </button>
            </div>
            {pdfUrl && (
              <div className="mt-6 space-y-3">
                <h3 className="font-bold">
                  原本PDF（判定には直接使用しません）
                </h3>
                <PdfCanvasViewer pdfUrl={pdfUrl} fileName={pdfName} />
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      await savePdfSource({
                        productId: product.id,
                        name: pdfName,
                        file: pdf!,
                      });
                      setMessage("PDF原本をこのブラウザに保存しました。");
                    } catch {
                      setError(
                        "PDF原本を保存できません。サイズマスタとは別の保存領域です。",
                      );
                    }
                  }}
                >
                  PDF原本を保存
                </button>
                <p className="muted">
                  PDF原本はブラウザ内に保存します。必要な原本は別途保管してください。
                </p>
              </div>
            )}
          </>
        )}
        {busy && <p role="status">PDFを抽出しています…</p>}
        {error && (
          <p role="alert" className="error mt-4">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-blue-700 mt-4">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2 className="section-title">商品・判定ルール管理／バックアップ</h2>
        <p className="muted">
          学校・商品カテゴリ・メーカー・品番・袖出し・裾出し・調整範囲・Fit／成長ルールをJSON形式で編集できます。すべての判定数値は暫定値です。変更後は試着検証してください。
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            className="secondary"
            onClick={() => downloadJson(master, "kirinji-master-v2.json")}
          >
            保存済みマスタを書き出す
          </button>
          <label className="secondary">
            バックアップを確認用に読み込む
            <input
              className="mt-2"
              type="file"
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const raw = await file.text();
                  validateMaster(JSON.parse(raw));
                  setFullJson(raw);
                  setFullConfirmed(false);
                  setMessage("読み込み内容を確認し、保存してください。");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </label>
          <button
            className="secondary"
            onClick={() => {
              const old = localStorage.getItem("uniform_school_data");
              if (old)
                downloadJson(JSON.parse(old), "uniform-v1-reference.json");
              else setMessage("旧版の保存データはありません。");
            }}
          >
            旧版データを書き出す
          </button>
        </div>
        <p className="muted mt-3">
          旧版データは変更・自動移行しません。商品カテゴリと実寸の意味を確認したうえでV2マスタへ登録してください。採寸値はセッション中のみ保持します。
        </p>
        <details className="mt-5">
          <summary className="font-bold cursor-pointer">
            マスタJSONを編集する
          </summary>
          <textarea
            aria-label="マスタJSON"
            className="font-mono text-xs"
            rows={18}
            value={fullJson}
            onChange={(e) => {
              setFullJson(e.target.value);
              setFullConfirmed(false);
            }}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={fullConfirmed}
              onChange={(e) => setFullConfirmed(e.target.checked)}
            />
            変更内容と参照先・暫定ルールを確認しました
          </label>
          <button
            className="primary mt-3"
            disabled={!fullConfirmed}
            onClick={() => {
              try {
                const value = JSON.parse(fullJson);
                validateMaster(value);
                onSave(value);
                setMessage("マスタとルールを保存しました。");
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            確認済みJSONを保存
          </button>
        </details>
        <details className="mt-5">
          <summary className="font-bold cursor-pointer">
            判定ルール一覧（暫定値）
          </summary>
          {master.ruleSets.map((set) => (
            <div key={set.id} className="mt-4">
              <h3 className="font-bold">
                {categoryLabels[set.category]} ／ {set.id}
              </h3>
              <div className="overflow-x-auto">
                <table className="dimension-table">
                  <thead>
                    <tr>
                      <th>部位</th>
                      <th>HARD範囲</th>
                      <th>理想範囲</th>
                      <th>許容範囲</th>
                      <th>重み</th>
                    </tr>
                  </thead>
                  <tbody>
                    {set.rules.map((r) => (
                      <tr key={r.id}>
                        <td>{fieldLabels[measurementFields[r.measurement]]}</td>
                        <td>
                          {r.hardConstraint
                            ? `${r.hardMin ?? "なし"}～${r.hardMax ?? "なし"}`
                            : "なし"}
                        </td>
                        <td>
                          {r.idealMin}～{r.idealMax}
                        </td>
                        <td>
                          {r.acceptableMin}～{r.acceptableMax}
                        </td>
                        <td>{r.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </details>
      </section>
    </div>
  );
}
