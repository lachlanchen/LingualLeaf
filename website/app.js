const rawBase = "https://raw.githubusercontent.com/lachlanchen/LinguaLeaf/main/";
const isGithubPages = window.location.hostname.endsWith("github.io");
const manifestUrl = isGithubPages
  ? rawUrl("references/max-language-large-font-exports.json")
  : "../references/max-language-large-font-exports.json";
const grid = document.querySelector("#book-grid");
const searchInput = document.querySelector("#search");
const filters = document.querySelector("#family-filters");
const resultCount = document.querySelector("#result-count");

let allBooks = [];
let activeFamily = "all";

const familyLabels = {
  "en-jp-zh": "English / 日本語 / 中文",
  "jp-zh": "日本語 / 中文",
  "wenyan-en-jp-zh": "文言文 / English / 日本語 / 中文",
  "wenyan-jp-zh": "文言文 / 日本語 / 中文",
};

function rawUrl(path) {
  return rawBase + path.split("/").map(encodeURIComponent).join("/");
}

function assetUrl(path) {
  if (!path) return "";
  return isGithubPages ? rawUrl(path) : `../${path}`;
}

function stripTitle(path) {
  const file = decodeURIComponent(path.split("/").pop() || "").replace(/\.pdf$/i, "");
  return file
    .replace(/・最大語種・大字版$/u, "")
    .replace(/・最大語種・史記字級$/u, "")
    .replace(/・黑白$/u, "");
}

function editionLabel(edition) {
  const labels = {
    "en-main-jp-zh": "English main / 日本語 / 中文",
    "wenyan-main-quadrilingual": "文言文 main / English / 日本語 / 中文",
    "wenyan-main-jp-zh": "文言文 main / 日本語 / 中文",
    "jp-main": "日本語 main / 中文",
    "zh-main": "中文 main / 日本語",
  };
  return labels[edition] || edition;
}

function readerHref(path, title) {
  return `reader.html?file=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}`;
}

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = [row.family, row.book_id, row.edition].join("::");
    if (!groups.has(key)) {
      groups.set(key, {
        family: row.family,
        bookId: row.book_id,
        edition: row.edition,
        preview: row.preview,
        modes: {},
      });
    }
    groups.get(key).modes[row.mode] = row;
  }
  return [...groups.values()]
    .map((book) => {
      const sample = book.modes.color || book.modes.blackwhite;
      const title = stripTitle(sample.export_pdf || sample.tracked_pdf);
      return {
        ...book,
        title,
        familyLabel: familyLabels[book.family] || book.family,
        editionLabel: editionLabel(book.edition),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

function renderFilters(books) {
  const families = [...new Set(books.map((book) => book.family))].sort();
  filters.innerHTML = "";
  const options = [["all", "All languages"], ...families.map((family) => [family, familyLabels[family] || family])];
  for (const [family, label] of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.textContent = label;
    button.dataset.family = family;
    button.addEventListener("click", () => {
      activeFamily = family;
      renderCatalog();
    });
    filters.append(button);
  }
}

function renderCatalog() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = allBooks.filter((book) => {
    const familyOk = activeFamily === "all" || book.family === activeFamily;
    const haystack = `${book.title} ${book.bookId} ${book.family} ${book.editionLabel}`.toLowerCase();
    return familyOk && (!query || haystack.includes(query));
  });

  for (const button of filters.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.family === activeFamily);
  }

  resultCount.textContent = `${visible.length} editions shown`;
  grid.innerHTML = "";
  for (const book of visible) {
    const color = book.modes.color;
    const blackwhite = book.modes.blackwhite;
    const preview = assetUrl(book.preview);
    const card = document.createElement("article");
    card.className = "book-card";
    card.innerHTML = `
      ${preview ? `<img src="${preview}" alt="${book.title} first-page preview" loading="lazy">` : ""}
      <div class="book-card-body">
        <h3>${book.title}</h3>
        <div class="book-meta">
          <span>${book.familyLabel}</span>
          <span>${book.editionLabel}</span>
        </div>
        <div class="book-actions">
          ${color ? `<a href="${readerHref(color.export_pdf, book.title)}">Read color</a>` : ""}
          ${blackwhite ? `<a href="${readerHref(blackwhite.export_pdf, `${book.title} black-white`)}">Read black-white</a>` : ""}
        </div>
      </div>`;
    grid.append(card);
  }
}

async function main() {
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    const manifest = await response.json();
    allBooks = groupRows(manifest.rows || []);
    const families = new Set(allBooks.map((book) => book.family));
    document.querySelector("#book-count").textContent = String(allBooks.length);
    document.querySelector("#pdf-count").textContent = String((manifest.rows || []).length);
    document.querySelector("#family-count").textContent = String(families.size);
    renderFilters(allBooks);
    renderCatalog();
    searchInput.addEventListener("input", renderCatalog);
  } catch (error) {
    resultCount.textContent = "Catalog failed to load.";
    grid.innerHTML = `<p class="reader-error">Could not load the LinguaLeaf manifest: ${error.message}</p>`;
  }
}

main();
