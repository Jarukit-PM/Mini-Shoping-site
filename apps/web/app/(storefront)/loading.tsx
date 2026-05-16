export default function StorefrontLoading() {
  return (
    <div className="fade-in">
      <section className="page-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 640 }}>
            <div className="label" style={{ marginBottom: 14, opacity: 0.3 }}>
              The November Edition · 2025
            </div>
            <h1 className="h-display" style={{ margin: 0, opacity: 0.3 }}>
              Made slowly,<br />kept a long time.
            </h1>
            <p className="body muted" style={{ maxWidth: 480, marginTop: 18, opacity: 0.3 }}>
              A small catalogue of household objects from independent makers we know.
            </p>
          </div>
          <div className="mono muted" style={{ textAlign: "right", opacity: 0.3 }}>
            <div>– / – items</div>
            <div>Free shipping ≥ $150</div>
          </div>
        </div>
      </section>

      <section className="catalog-wrap">
        <div className="catalog-toolbar" style={{ opacity: 0.3 }}>
          <div className="search" style={{ pointerEvents: "none" }}>
            <input disabled placeholder="Search by name, category, material…" />
          </div>
        </div>
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ opacity: 0.15 + i * 0.02 }}>
              <div style={{ background: "var(--rule)", borderRadius: 4, aspectRatio: "4/3" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                <div style={{ height: 14, background: "var(--rule)", borderRadius: 3, width: "70%" }} />
                <div style={{ height: 12, background: "var(--rule)", borderRadius: 3, width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
