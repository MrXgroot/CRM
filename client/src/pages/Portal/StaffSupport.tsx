import { FormEvent, useEffect, useState } from "react";
import SupportDesk from "./SupportDesk";
import { axios } from "../../utils/axios";
import { useAuth } from "../../contexts/AuthContext";
export default function StaffSupport() {
  const { user, currentEntity } = useAuth();
  const admin = user?.is_admin === 1 || user?.is_superadmin === 1;
  const [accounts, setAccounts] = useState<any[]>([]),
    [id, setId] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const r = await axios.get("/crm/support/accounts");
      setAccounts(r.data.data);
    } catch {
      setMessage("Unable to load customer access.");
    }
  }
  useEffect(() => {
    setId("");
    setEmail("");
    setPassword("");
    setMessage("");
    if (admin) load();
  }, [currentEntity, admin]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await axios.put(`/crm/support/access/${id}`, {
        email,
        password,
        active: true,
      });
      setPassword("");
      setMessage(
        "Access saved. Share credentials securely. Customers sign in at /customer/login",
      );
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Unable to save access.");
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    if (!id || !window.confirm("Disable portal access for this customer?"))
      return;
    setBusy(true);
    try {
      await axios.delete(`/crm/support/access/${id}`);
      setMessage("Customer access disabled.");
      await load();
    } catch {
      setMessage("Unable to disable access.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUSTOMER EXPERIENCE</span>
          <h1>Be there when it matters.</h1>
          <p>
            Give customers visibility and keep support conversations connected.
          </p>
        </div>
      </div>
      {admin && (
        <section className="panel" style={{ marginBottom: 28 }}>
          <h2>Customer portal access</h2>
          <p className="notice">
            Enable access or reset a password for an existing customer.
            Customers see only their own deals and requests.
          </p>
          <form className="inline-form" onSubmit={save}>
            <select
              aria-label="Customer"
              required
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                const a = accounts.find(
                  (a) => String(a.customer_id) === e.target.value,
                );
                setEmail(a?.login_email || a?.email || "");
                setPassword("");
                setMessage("");
              }}
            >
              <option value="">Select customer</option>
              {accounts.map((a) => (
                <option key={a.customer_id} value={a.customer_id}>
                  {a.company_name}{" "}
                  {a.is_active === 1
                    ? "· Enabled"
                    : a.is_active === 0
                      ? "· Disabled"
                      : ""}
                </option>
              ))}
            </select>
            <input
              aria-label="Customer login email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Customer email"
            />
            <input
              aria-label="Initial or reset password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (8+ characters)"
            />
            <button className="primary-button" disabled={busy || !id}>
              Save access
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !id}
              onClick={revoke}
            >
              Disable access
            </button>
          </form>
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </section>
      )}
      <SupportDesk />
    </>
  );
}
