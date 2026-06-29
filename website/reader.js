const params = new URLSearchParams(window.location.search);
const file = params.get("file");
const title = params.get("title") || "LinguaLeaf PDF";
const titleNode = document.querySelector("#reader-title");
const pageStatus = document.querySelector("#page-status");
const canvas = document.querySelector("#pdf-canvas");
const errorNode = document.querySelector("#reader-error");
const downloadLink = document.querySelector("#download-link");
const prevButton = document.querySelector("#prev-page");
const nextButton = document.querySelector("#next-page");
const rawBase = "https://raw.githubusercontent.com/lachlanchen/LinguaLeaf/main/";
const isGithubPages = window.location.hostname.endsWith("github.io");

let pdfDoc = null;
let pageNum = 1;
let rendering = false;
let pendingPage = null;

function showError(message) {
  errorNode.hidden = false;
  errorNode.textContent = message;
  pageStatus.textContent = "Unable to render PDF";
}

function pdfUrl() {
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;
  const clean = file.replace(/^\/+/, "");
  if (!isGithubPages) return `../${clean}`;
  return rawBase + clean.split("/").map(encodeURIComponent).join("/");
}

async function renderPage(num) {
  rendering = true;
  const page = await pdfDoc.getPage(num);
  const viewportBase = page.getViewport({ scale: 1 });
  const maxWidth = Math.min(window.innerWidth - 36, 980);
  const scale = Math.max(0.72, Math.min(1.45, maxWidth / viewportBase.width));
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext("2d");
  const outputScale = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

  await page.render({ canvasContext: context, viewport }).promise;
  pageStatus.textContent = `Page ${num} of ${pdfDoc.numPages}`;
  prevButton.disabled = num <= 1;
  nextButton.disabled = num >= pdfDoc.numPages;
  rendering = false;

  if (pendingPage !== null) {
    const next = pendingPage;
    pendingPage = null;
    renderPage(next);
  }
}

function queueRenderPage(num) {
  if (rendering) {
    pendingPage = num;
  } else {
    renderPage(num).catch((error) => showError(error.message));
  }
}

async function main() {
  titleNode.textContent = title;
  const url = pdfUrl();
  if (!url) {
    showError("No PDF file was provided.");
    return;
  }

  downloadLink.href = url;
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  try {
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    prevButton.addEventListener("click", () => {
      if (pageNum <= 1) return;
      pageNum -= 1;
      queueRenderPage(pageNum);
    });
    nextButton.addEventListener("click", () => {
      if (pageNum >= pdfDoc.numPages) return;
      pageNum += 1;
      queueRenderPage(pageNum);
    });
    await renderPage(pageNum);
  } catch (error) {
    showError(`Could not load ${url}: ${error.message}`);
  }
}

main();
