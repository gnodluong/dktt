export default function Loading() {
  return (
    <div className="stack" style={{ paddingTop: 8 }}>
      <span className="skeleton" style={{ height: 30, width: "34%" }} />
      <span className="skeleton" style={{ height: 76, marginTop: 10 }} />
      <span className="skeleton" style={{ height: 22, width: "45%", marginTop: 18 }} />
      <span className="skeleton" style={{ height: 90 }} />
      <span className="skeleton" style={{ height: 90 }} />
    </div>
  );
}
