import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { axios } from "../utils/axios";
import { useAuth } from "../contexts/AuthContext";
type Stats = {
  total_leads: number;
  qualified_leads: number;
  total_customers: number;
  active_customers: number;
  total_deals: number;
  won_deals: number;
  pipeline_value: number;
  total_revenue: number;
  pending_activities: number;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export default function Home() {
  const { user, currentEntity, currentBranch, pageAccess } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const can = (path: string) =>
    user?.is_superadmin === 1 || pageAccess.some((p) => p.url === path);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await axios.get("/crm/stats");
      if (!r.data.success) throw new Error(r.data.message);
      setStats(r.data.data);
      if (can("/crm/activities")) {
        const a = await axios.get("/crm/activities", {
          params: { status: "Pending" },
        });
        setActivities(a.data.data || []);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [currentEntity, currentBranch]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RELATIONSHIP OVERVIEW</span>
          <h1>Make your next move.</h1>
          <p>Your customers, opportunities and follow-ups in one place.</p>
        </div>
        <button className="secondary-button" onClick={load} disabled={busy}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {error ? (
        <div className="error-box" role="alert">
          {error}
        </div>
      ) : busy && !stats ? (
        <p className="loading-state">Loading your workspace…</p>
      ) : (
        stats && (
          <>
            <div className="metric-grid">
              {[
                [
                  "Customers",
                  stats.total_customers,
                  `${stats.active_customers} active relationships`,
                ],
                [
                  "Open pipeline",
                  money(stats.pipeline_value),
                  `${stats.total_deals} total deals`,
                ],
                [
                  "Leads",
                  stats.total_leads,
                  `${stats.qualified_leads} qualified opportunities`,
                ],
                [
                  "Won revenue",
                  money(stats.total_revenue),
                  `${stats.won_deals} won deals`,
                ],
              ].map(([label, value, caption]) => (
                <article className="metric" key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <p>{caption}</p>
                </article>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <h2>
                  Keep the conversation moving{" "}
                  <span className="badge">
                    {stats.pending_activities} pending
                  </span>
                </h2>
                {!can("/crm/activities") ? (
                  <p className="empty-state">
                    Ask your administrator for activity access.
                  </p>
                ) : activities.length ? (
                  activities.slice(0, 6).map((a) => (
                    <Link
                      to="/crm/activities"
                      className="data-row"
                      key={a.activity_id}
                    >
                      <div>
                        <strong>{a.title}</strong>
                        <small>
                          {a.activity_type} · {a.priority} priority
                        </small>
                      </div>
                      <span className="badge">{a.status}</span>
                    </Link>
                  ))
                ) : (
                  <p className="empty-state">
                    No pending follow-ups.
                    <br />
                    Create an activity to plan your next customer conversation.
                  </p>
                )}
              </section>
              <section className="panel">
                <h2>Your relationship workspace</h2>
                {[
                  [
                    "/crm/leads",
                    "Build your pipeline",
                    "Capture and qualify new opportunities",
                  ],
                  [
                    "/crm/customers",
                    "Know your customers",
                    "Manage contacts and account details",
                  ],
                  [
                    "/crm/deals",
                    "Move deals forward",
                    "Track stages, approvals and value",
                  ],
                  [
                    "/crm/support",
                    "Resolve customer requests",
                    "Respond to tickets and track resolution",
                  ],
                ]
                  .filter(
                    ([url]) =>
                      can(url) ||
                      (url === "/crm/support" && user?.is_admin === 1),
                  )
                  .map(([url, title, caption]) => (
                    <Link to={url} className="data-row" key={url}>
                      <div>
                        <strong>{title}</strong>
                        <small>{caption}</small>
                      </div>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
