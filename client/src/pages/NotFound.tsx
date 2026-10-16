import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <main className="portal-shell">
      <section className="panel" style={{ marginTop: "15vh" }}>
        <span className="eyebrow">MATRIKA · 404</span>
        <h1 style={{ fontSize: 36, margin: "20px 0" }}>
          This page isn't here.
        </h1>
        <p className="notice">Check the address or return to your workspace.</p>
        <Link className="primary-button" to="/">
          Open workspace
        </Link>
      </section>
    </main>
  );
}
