import type { MasterData } from "../domain/types";
import { schools } from "../data/schools";
import { products } from "../data/products";
import { sizes } from "../data/sizes";
import { fitRuleSets } from "../data/fitRules";
import { growthRules } from "../data/growthRules";
import { validateMaster } from "../logic/validate";
export const storageKey = "kirinji_uniform_master_v2";
export function initialMaster(): MasterData {
  return structuredClone({
    version: 2,
    schools,
    products,
    sizes,
    ruleSets: fitRuleSets,
    growthRules,
  });
}
export function loadMaster(): { master: MasterData; error: string } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { master: initialMaster(), error: "" };
    const master = JSON.parse(raw);
    validateMaster(master);
    return { master, error: "" };
  } catch {
    return {
      master: initialMaster(),
      error:
        "保存済みV2マスタを読み込めません。元データは保持しています。バックアップを確認して再登録してください。",
    };
  }
}
export function saveMaster(master: MasterData) {
  validateMaster(master);
  localStorage.setItem(storageKey, JSON.stringify(master));
}
export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
