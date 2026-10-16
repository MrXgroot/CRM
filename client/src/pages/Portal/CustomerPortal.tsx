import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { portalApi } from "./api";
import SupportDesk from "./SupportDesk";
export default function CustomerPortal() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const navigate = useNavigate(),
    token = sessionStorage.getItem("portal_token");
  async function load() {
    setError("");
    try {
      const r = await portalApi.get("/portal/overview");
      setData(r.data.data);
    } catch {
      setError("Unable to load your account. Please retry.");
    }
  }
  useEffect(() => {
    if (token) load();
  }, [token]);
  async function logout() {
    try {
      await portalApi.post("/portal/logout");
    } finally {
      sessionStorage.removeItem("portal_token");
      navigate("/customer/login");
    }
  }
  if (!token) return <Navigate to="/customer/login" replace />;
  return (
    <main className="portal-shell">
      <header className="portal-header">
        <span className="wordmark">
          <span className="brand-mark">m.</span>matrika
        </span>
        <span className="eyebrow">CUSTOMER PORTAL</span>
        <button className="secondary-button" onClick={logout}>
          Sign out
        </button>
      </header>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR RELATIONSHIP WITH MATRIKA</span>
          <h1>
            {data
              ? `Hello, ${data.customer?.contact_name || "there"}.`
              : "Your customer workspace"}
          </h1>
          <p>
            {data?.customer?.company_name ||
              "Track your progress and connect with your team."}
          </p>
        </div>
        <button className="secondary-button" onClick={load}>
          Refresh progress
        </button>
      </div>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {!data && !error ? (
        <p className="loading-state">Loading your account…</p>
      ) : (
        data && (
          <section className="panel" style={{ marginBottom: 28 }}>
            <h2>Your deals & progress</h2>
            {data.deals.length ? (
              data.deals.map((d: any) => (
                <article className="data-row" key={d.deal_id}>
                  <div>
                    <strong>{d.deal_name}</strong>
                    <small>
                      {d.status} ·{" "}
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(d.amount)}
                    </small>
                  </div>
                  <span className="badge">{d.stage}</span>
                </article>
              ))
            ) : (
              <p className="empty-state">
                No deals linked yet. Your team will add updates here.
              </p>
            )}
          </section>
        )
      )}
      <SupportDesk customer />
      <p className="notice">Matrika Technology · Bangalore</p>
    </main>
  );
}
