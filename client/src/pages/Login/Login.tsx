import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  Users,
  Handshake,
  LifeBuoy,
} from "lucide-react";
import http from "axios";
import { baseURL } from "../../utils/axios";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";
export function LoginPage({ customer = false }: { customer?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const auth = useAuth();
  const navigate = useNavigate();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await http.post(
        `${baseURL}${customer ? "/portal/login" : "/user/login"}`,
        { email: email.trim().toLowerCase(), password },
      );
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.data.twofa_required)
        throw new Error(
          "Two-factor verification is not available on this server. Contact your administrator.",
        );
      if (customer) {
        sessionStorage.setItem("portal_token", r.data.data.token);
        navigate("/portal");
      } else auth.signin(r.data.data, () => navigate("/"));
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          e.message ||
          "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Link to="/login" className="wordmark">
          <span className="brand-mark">m.</span>matrika
        </Link>
        <div className="story-copy">
          <span className="eyebrow">RELATIONSHIPS THAT MOVE BUSINESS</span>
          <h1>
            A little closer.
            <br />A lot further.
          </h1>
          <p>
            One connected workspace for the people, conversations and
            opportunities that matter.
          </p>
          <div className="relationship-flow">
            <span>
              <Users />
              Connect
            </span>
            <i />
            <span>
              <Handshake />
              Grow
            </span>
            <i />
            <span>
              <LifeBuoy />
              Support
            </span>
          </div>
        </div>
        <p className="story-footer">Matrika Technology · Bangalore</p>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">
            {customer ? "CUSTOMER PORTAL" : "YOUR WORKSPACE"}
          </span>
          <h2>{customer ? "Your progress. Your space." : "Welcome back."}</h2>
          <p className="muted">
            {customer
              ? "Track your deals and get help from your Matrika team."
              : "Sign in to manage your customer relationships."}
          </p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <p role="alert" className="error-box">
                {error}
              </p>
            )}
            <button className="primary-button" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="login-help">
            Need access or a password reset? Contact your workspace
            administrator.
          </p>
          <Link
            className="login-switch"
            to={customer ? "/login" : "/customer/login"}
          >
            {customer
              ? "Team member? Sign in to CRM"
              : "Customer? Open your portal"}{" "}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
