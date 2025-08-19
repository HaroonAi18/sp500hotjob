// scripts/update_sp500.cjs
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { writeToPath } = require("@fast-csv/format");

// ---- config ----
const DATA_DIR = path.join(process.cwd(), "Data");
const JSON_PATH = path.join(DATA_DIR, "sp500_companies.json");
const CSV_PATH  = path.join(DATA_DIR, "sp500_companies.csv");
const WIKI_URL  = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies";

// ensure Data/ exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

async function fetchWikipediaHtml() {
  const res = await fetch(WIKI_URL, {
    headers: { "User-Agent": "sp500hotjob/1.0 (educational project)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function parseConstituents(html) {
  const $ = cheerio.load(html);

  // Try the canonical table first
  let $table = $("#constituents");
  if ($table.length === 0) {
    // fallback: first wikitable on the page
    $table = $("table.wikitable").first();
  }

  const rows = [];
  $table.find("tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length >= 2) {
      const symbol = $(tds[0]).text().trim().replace(/\u00A0/g, " ");
      const name   = $(tds[1]).text().trim().replace(/\u00A0/g, " ");
      const sector = tds[3] ? $(tds[3]).text().trim() : "";
      if (symbol && name) {
        rows.push({ symbol, name, sector });
      }
    }
  });

  if (!rows.length) {
    throw new Error("Parsed 0 rows — Wikipedia layout may have changed.");
  }

  // Sort for stable output
  rows.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return rows;
}

function loadPrevious() {
  if (!fs.existsSync(JSON_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function diff(prev, next) {
  const prevSet = new Set(prev.map(x => x.symbol));
  const nextSet = new Set(next.map(x => x.symbol));
  const added   = next.filter(x => !prevSet.has(x.symbol));
  const removed = prev.filter(x => !nextSet.has(x.symbol));
  return { added, removed };
}

async function writeCsv(list) {
  await new Promise((resolve, reject) => {
    writeToPath(CSV_PATH, list, {
      headers: true,
      writeHeaders: true,
      // Map keys to readable headers
      transform: row => ({
        Ticker: row.symbol,
        "Company Name": row.name,
        Sector: row.sector || "",
      }),
    })
      .on("finish", resolve)
      .on("error", reject);
  });
}

async function main() {
  console.log("Fetching S&P 500 list from Wikipedia…");
  const html = await fetchWikipediaHtml();
  const next = parseConstituents(html);
  const prev = loadPrevious();

  // Write JSON
  fs.writeFileSync(JSON_PATH, JSON.stringify(next, null, 2));
  console.log(`✔ Wrote ${next.length} companies → ${JSON_PATH}`);

  // Write CSV
  await writeCsv(next);
  console.log(`✔ Wrote ${next.length} companies → ${CSV_PATH}`);

  // Diff and save changes file if needed
  const { added, removed } = diff(prev, next);
  if (added.length || removed.length) {
    const stamp = new Date().toISOString().slice(0, 10);
    const changesPath = path.join(DATA_DIR, `sp500_changes_${stamp}.json`);
    fs.writeFileSync(changesPath, JSON.stringify({ added, removed }, null, 2));
    console.log(
      `Δ Changes detected → ${added.length} added, ${removed.length} removed. See ${changesPath}`
    );
  } else {
    console.log("No changes detected.");
  }

  console.log("Done.");
}

main().catch(err => {
  console.error("Updater failed:", err.message);
  process.exit(1);
});
