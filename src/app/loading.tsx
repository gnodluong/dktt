export default function Loading() {
  return (
    <main className="page">
      <div className="wrap stack">
        <span className="skeleton" style={{ height: 40, width: "55%" }} />
        <span className="skeleton" style={{ height: 16, width: "92%" }} />
        <span className="skeleton" style={{ height: 16, width: "70%" }} />
        <span className="skeleton" style={{ height: 156, marginTop: 8 }} />
        <span className="skeleton" style={{ height: 54 }} />
      </div>
    </main>
  );
}
