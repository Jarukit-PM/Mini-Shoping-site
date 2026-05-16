export default function ProductDetailLoading() {
  return (
    <div className="product-page fade-in" style={{ opacity: 0.25 }}>
      <div className="product-gallery">
        <div style={{ background: "var(--rule)", borderRadius: 4, aspectRatio: "1/1", width: "100%" }} />
        <div className="thumbs">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: "var(--rule)", borderRadius: 4, aspectRatio: "1/1" }} />
          ))}
        </div>
      </div>

      <div className="product-info" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ height: 12, background: "var(--rule)", borderRadius: 3, width: "30%" }} />
          <div style={{ height: 32, background: "var(--rule)", borderRadius: 3, width: "75%" }} />
          <div style={{ height: 24, background: "var(--rule)", borderRadius: 3, width: "20%" }} />
        </div>
        <div style={{ height: 60, background: "var(--rule)", borderRadius: 3 }} />
        <div style={{ height: 48, background: "var(--rule)", borderRadius: 3 }} />
      </div>
    </div>
  );
}
