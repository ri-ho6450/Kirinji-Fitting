import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export async function extractPdfText(file: File): Promise<string> {
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  try {
    const pdf = await task.promise;
    const lines: string[] = [];
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      const rows = new Map<number, { str: string; x: number }[]>();
      for (const item of content.items)
        if ("str" in item) {
          const y = Math.round(item.transform[5] / 6) * 6;
          const row = rows.get(y) ?? [];
          row.push({ str: item.str, x: item.transform[4] });
          rows.set(y, row);
        }
      for (const y of [...rows.keys()].sort((a, b) => b - a))
        lines.push(
          rows
            .get(y)!
            .sort((a, b) => a.x - b.x)
            .map((i) => i.str)
            .join("\t"),
        );
    }
    return lines.join("\n");
  } finally {
    await task.destroy();
  }
}
export interface PdfSource {
  productId: string;
  name: string;
  file: Blob;
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("kirinji-pdf-sources", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("sources", { keyPath: "productId" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function savePdfSource(source: PdfSource) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("sources", "readwrite");
      tx.objectStore("sources").put(source);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function loadPdfSource(
  productId: string,
): Promise<PdfSource | undefined> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const req = db
        .transaction("sources")
        .objectStore("sources")
        .get(productId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
