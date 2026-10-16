import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { axios } from "../utils/axios";
export default function ChangePassword() {
  const { user } = useAuth();
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [current, setCurrent] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const r = await axios.post("/user/change-password", {
        user_password: password,
        current_password: current,
        branch_id: user?.branch_id,
      });
      if (!r.data.success) throw new Error(r.data.message);
      setPassword("");
      setConfirm("");
      setCurrent("");
      setSuccess("Password changed successfully.");
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT SECURITY</span>
          <h1>Change password</h1>
          <p>Choose a password that you do not use elsewhere.</p>
        </div>
      </div>
      <form
        className="panel ticket-form"
        style={{ maxWidth: 540 }}
        onSubmit={submit}
      >
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="notice">
            {success}
          </p>
        )}
        <button disabled={busy} className="primary-button">
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </>
  );
}
