import type { PageImage } from "./types";

// pdf.js is loaded lazily (client-only) because it touches the DOM/canvas.
async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}

const MAX_RENDER_WIDTH = 1600; // cap so payloads/vision calls stay reasonably sized

/** Converts a single uploaded File (PDF or image) into an array of rendered page images. */
export async function fileToPageImages(file: File): Promise<PageImage[]> {
  if (file.type === "application/pdf") {
    return pdfToPageImages(file);
  }
  if (file.type.startsWith("image/")) {
    const img = await imageFileToPageImage(file);
    return [img];
  }
  throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
}

async function pdfToPageImages(file: File): Promise<PageImage[]> {
  const pdfjsLib = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pages: PageImage[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_RENDER_WIDTH / baseViewport.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    await page.render({ canvasContext: ctx, viewport }).promise;

    pages.push({
      page: pageNum,
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      width: canvas.width,
      height: canvas.height,
    });
  }
  return pages;
}

async function imageFileToPageImage(file: File): Promise<PageImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

  const dims = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = dataUrl;
    }
  );

  // Downscale very large photos so vision payloads stay reasonable.
  let { width, height } = dims;
  if (width > MAX_RENDER_WIDTH) {
    const scale = MAX_RENDER_WIDTH / width;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const resized = await resizeDataUrl(dataUrl, width, height);
    return { page: 1, dataUrl: resized, width, height };
  }

  return { page: 1, dataUrl, width, height };
}

async function resizeDataUrl(
  dataUrl: string,
  width: number,
  height: number
): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image for resize"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
