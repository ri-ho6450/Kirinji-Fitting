import { useState, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
function PdfCanvasViewer({
  pdfUrl,
  fileName,
}: {
  pdfUrl: string;
  fileName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | undefined;
    let renderTask: pdfjsLib.RenderTask | undefined;
    setLoading(true);
    setError(null);

    const renderPages = async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        setNumPages(pdf.numPages);
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale });
          const pageWrapper = document.createElement("div");
          pageWrapper.className =
            "mb-4 bg-white shadow-md rounded-lg overflow-hidden border border-slate-200 flex flex-col items-center p-2";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";

          if (context) {
            renderTask = page.render({
              canvasContext: context,
              viewport,
              canvas,
            });
            await renderTask.promise;
            renderTask = undefined;
          }

          if (isCancelled) return;
          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Canvas PDF render error:", err);
          setError("PDFの描画に失敗しました。");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    renderPages();

    return () => {
      isCancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [pdfUrl, scale]);

  const handleOpenNewTab = () => {
    try {
      if (pdfUrl.startsWith("data:")) {
        const parts = pdfUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "application/pdf";
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else {
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs flex-shrink-0 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 truncate max-w-xs">
            📄 {fileName || "登録済みPDF寸法表"}
          </span>
          {numPages > 0 && (
            <span className="text-slate-500 font-medium">
              ({numPages} ページ)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            縮小 -
          </button>
          <span className="font-mono text-slate-600 font-bold px-1">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            拡大 +
          </button>
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm transition-colors"
          >
            別タブで開く <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-y-auto bg-slate-800/90 p-4 min-h-[50vh] max-h-[60vh] flex justify-center border border-slate-300">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm text-white font-bold text-sm gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            PDFを描画中...
          </div>
        )}
        {error && (
          <div className="text-red-400 font-bold p-4 text-center my-auto">
            {error}
          </div>
        )}
        <div ref={containerRef} className="w-full flex flex-col items-center" />
      </div>
    </div>
  );
}

// --- Types & Constants ---

export default PdfCanvasViewer;
