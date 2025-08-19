import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

export default function App() {
  // Views: "landing" | "companies" | "detail"
  const [view, setView] = useState("landing");
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Data
  const [companies, setCompanies] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // UI state for Companies view
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("Ticker"); // "Ticker" | "Company Name"
  const [sortDir, setSortDir] = useState("asc");    // "asc" | "desc"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load CSV only when entering the Companies view the first time
  useEffect(() => {
    if (view !== "companies" || loaded) return;

    Papa.parse("/Data/sp500_companies.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || []).filter(
          (r) => r.Ticker && r["Company Name"]
        );
        setCompanies(rows);
        setLoaded(true);
      },
      error: (err) => {
        console.error("CSV load error:", err);
        setLoaded(true);
      },
    });
  }, [view, loaded]);

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return companies;
    const q = query.toLowerCase();
    return companies.filter(
      (r) =>
        String(r.Ticker).toLowerCase().includes(q) ||
        String(r["Company Name"]).toLowerCase().includes(q)
    );
  }, [companies, query]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = String(a[sortKey] ?? "").toLowerCase();
      const bv = String(b[sortKey] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [query, sortKey, sortDir, pageSize]);

  function clickHeader(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  /* ===================== Detail View ===================== */
  if (view === "detail" && selectedCompany) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b1220", color: "white" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontWeight: 800 }}>S&amp;P500HotJob</div>
          <button
            onClick={() => setView("companies")}
            style={outlineBtn}
          >
            ← Back to Companies
          </button>
        </header>

        <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
          <h1 style={{ marginBottom: 8 }}>
            {selectedCompany["Company Name"]} ({selectedCompany.Ticker})
          </h1>
          <p style={{ opacity: 0.7, marginBottom: 24 }}>
            Sector: {selectedCompany.Sector || "N/A"}
          </p>

          <section
            style={{
              padding: 20,
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
            }}
          >
            <h2 style={{ marginBottom: 12 }}>Jobs (Coming Soon)</h2>
            <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
              We’ll display real job postings for <b>{selectedCompany.Ticker}</b> here
              once the jobs engine is hooked up.
            </p>
          </section>
        </main>
      </div>
    );
  }

  /* ===================== Companies View ===================== */
  if (view === "companies") {
    return (
      <div style={{ minHeight: "100vh", background: "#0b1220", color: "white" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>S&amp;P500HotJob</div>
          <button onClick={() => setView("landing")} style={outlineBtn}>
            ← Back
          </button>
        </header>

        <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ marginBottom: 8 }}>S&amp;P 500 Companies</h1>
          <p style={{ opacity: 0.7, marginBottom: 16 }}>
            Data source: <code>Data/sp500_companies.csv</code> (auto-updater ready).
          </p>

          {/* Controls */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ticker or company name…"
              style={searchInput}
            />
            <label style={{ opacity: 0.85 }}>
              Page size:&nbsp;
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={selectInput}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Table */}
          <div style={tableWrap}>
            <table style={tableBase}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                  {["Ticker", "Company Name"].map((key) => {
                    const active = sortKey === key;
                    return (
                      <th
                        key={key}
                        onClick={() => clickHeader(key)}
                        style={th(active)}
                        title="Click to sort"
                      >
                        {key}
                        {active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paged.map((row, i) => (
                  <tr
                    key={`${row.Ticker}-${i}`}
                    onClick={() => {
                      setSelectedCompany(row);
                      setView("detail");
                    }}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: 12, fontFamily: "monospace" }}>
                      {row.Ticker}
                    </td>
                    <td style={{ padding: 12 }}>{row["Company Name"]}</td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ padding: 16, opacity: 0.7 }}>
                      No matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={pagerBar}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={btnStyle(currentPage <= 1)}
            >
              ← Prev
            </button>

            {pageNumbers(currentPage, totalPages, 7).map((n, idx) =>
              n === "…" ? (
                <span key={`dots-${idx}`} style={{ opacity: 0.6 }}>
                  …
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    ...btnStyle(false),
                    background: n === currentPage ? "white" : "transparent",
                    color: n === currentPage ? "black" : "white",
                    borderColor:
                      n === currentPage ? "white" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {n}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={btnStyle(currentPage >= totalPages)}
            >
              Next →
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 8, opacity: 0.7 }}>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, total)} of {total}
          </div>
        </main>
      </div>
    );
  }

  /* ===================== Landing View ===================== */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1e3a8a 0%, #111827 50%, #000000 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>
          S&amp;P500HotJob
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setView("companies")}
            style={outlineBtn}
          >
            Companies
          </button>
          <button
            onClick={() => alert("Jobs page coming soon!")}
            style={primaryBtn}
          >
            Explore Jobs
          </button>
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: 12 }}>
            S&amp;P500 Daily Jobs
          </h1>
          <p style={{ marginBottom: 24, fontSize: "1.15rem", opacity: 0.85 }}>
            Fresh opportunities from S&amp;P 500 companies — updated daily.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => setView("companies")}
              style={outlineBtnBig}
            >
              View Companies
            </button>
            <button
              onClick={() => alert("Jobs page coming soon!")}
              style={primaryBtnBig}
            >
              Explore Jobs
            </button>
          </div>
        </div>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "12px 24px",
          opacity: 0.6,
          fontSize: 12,
        }}
      >
        © {new Date().getFullYear()} S&amp;P500HotJob — MVP
      </footer>
    </div>
  );
}

/* ---------------- styles & helpers ---------------- */
const outlineBtn = {
  background: "transparent",
  color: "white",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 10,
  padding: "8px 14px",
  cursor: "pointer",
};
const primaryBtn = {
  background: "#facc15",
  color: "black",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const outlineBtnBig = { ...outlineBtn, borderRadius: 12, padding: "12px 20px" };
const primaryBtnBig = { ...primaryBtn, borderRadius: 12, padding: "12px 20px" };

const searchInput = {
  flex: 1,
  minWidth: 260,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  outline: "none",
};

const selectInput = {
  padding: "8px 10px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.05)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.2)",
};

const tableWrap = {
  overflowX: "auto",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

const tableBase = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 520,
};

const th = (active) => ({
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
  userSelect: "none",
  color: active ? "white" : "rgba(255,255,255,0.9)",
});

function btnStyle(disabled) {
  return {
    background: "transparent",
    color: disabled ? "rgba(255,255,255,0.4)" : "white",
    border: `1px solid ${disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)"}`,
    borderRadius: 10,
    padding: "8px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const pagerBar = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 16,
  flexWrap: "wrap",
};

function pageNumbers(current, total, width = 7) {
  const pages = [];
  if (total <= width) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const half = Math.floor(width / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + width - 1);
  if (end - start + 1 < width) start = Math.max(1, end - width + 1);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) {
    if (end < total - 1) pages.push("…");
    pages.push(total);
  }
  return pages;
}
