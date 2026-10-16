import { FormEvent, useEffect, useState } from "react";
import { portalApi } from "./api";
import { axios } from "../../utils/axios";
import { useAuth } from "../../contexts/AuthContext";
type Ticket = {
  ticket_id: number;
  subject: string;
  priority: string;
  status: string;
  company_name?: string;
};
type Message = { message_id: number; author_type: string; body: string };
const statuses = [
  "Open",
  "In progress",
  "Waiting for customer",
  "Resolved",
  "Closed",
];
export default function SupportDesk({
  customer = false,
}: {
  customer?: boolean;
}) {
  const api = customer ? portalApi : axios,
    prefix = customer ? "/portal" : "/crm/support";
  const { currentEntity, currentBranch } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]),
    [selected, setSelected] = useState<number | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [filter, setFilter] = useState("All"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [compose, setCompose] = useState(false),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [priority, setPriority] = useState("Normal"),
    [reply, setReply] = useState("");
  const current = tickets.find((t) => t.ticket_id === selected);
  async function load() {
    setLoading(true);
    try {
      const r = await api.get(`${prefix}/tickets`);
      setTickets(r.data.data);
    } catch {
      setError("Unable to load support requests. Try again.");
    } finally {
      setLoading(false);
    }
  }
  async function conversation(id: number) {
    const r = await api.get(`${prefix}/tickets/${id}/messages`);
    setMessages(r.data.data);
  }
  useEffect(() => {
    setSelected(null);
    setMessages([]);
    load();
  }, [customer, currentEntity, currentBranch]);
  useEffect(() => {
    setMessages([]);
    if (selected) {
      let active = true;
      api
        .get(`${prefix}/tickets/${selected}/messages`)
        .then((r) => {
          if (active) setMessages(r.data.data);
        })
        .catch(() => {
          if (active) setError("Unable to load the conversation.");
        });
      return () => {
        active = false;
      };
    }
  }, [selected, customer]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.post(`${prefix}/tickets`, {
        subject,
        message: body,
        priority,
      });
      await load();
      setSelected(r.data.data.ticket_id);
      setCompose(false);
      setSubject("");
      setBody("");
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          "Unable to create request. Your text is preserved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`${prefix}/tickets/${selected}/messages`, {
        message: reply,
      });
      setReply("");
      await conversation(selected);
      await load();
    } catch {
      setError("Unable to send reply. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function status(value: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`${prefix}/tickets/${selected}`, { status: value });
      await load();
      await conversation(selected);
    } catch {
      setError("Unable to update status.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="support-toolbar">
        <div>
          <h2>{customer ? "Your support requests" : "Support inbox"}</h2>
          <p className="notice">
            {customer
              ? "Ask a question and follow your request through to resolution."
              : "One conversation from first question to resolution."}
          </p>
        </div>
        <div className="inline-form">
          <select
            aria-label="Filter ticket status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All", ...statuses].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="secondary-button"
            disabled={busy || loading}
            onClick={async () => {
              setError("");
              await load();
              if (selected)
                try {
                  await conversation(selected);
                } catch {
                  setError("Unable to refresh conversation.");
                }
            }}
          >
            Refresh
          </button>
          {customer && (
            <button
              className="primary-button"
              onClick={() => setCompose(!compose)}
            >
              {compose ? "Close form" : "New request"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {compose && (
        <form className="panel ticket-form" onSubmit={create}>
          <label>
            Subject
            <input
              required
              maxLength={160}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {["Low", "Normal", "High", "Urgent"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            How can we help?
            <textarea
              rows={4}
              required
              maxLength={10000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button
            className="primary-button"
            disabled={busy || !subject.trim() || !body.trim()}
          >
            Create request
          </button>
        </form>
      )}
      <div className="ticket-layout">
        <div className="panel ticket-list">
          {loading && !tickets.length ? (
            <p className="loading-state">Loading requests…</p>
          ) : tickets.filter((t) => filter === "All" || t.status === filter)
              .length ? (
            tickets
              .filter((t) => filter === "All" || t.status === filter)
              .map((t) => (
                <button
                  key={t.ticket_id}
                  className={selected === t.ticket_id ? "selected" : ""}
                  onClick={() => {
                    setSelected(t.ticket_id);
                    setReply("");
                    setError("");
                  }}
                >
                  <small>
                    #{t.ticket_id} · {t.company_name || t.priority}
                  </small>
                  <strong>{t.subject}</strong>
                  <span className="badge">{t.status}</span>
                </button>
              ))
          ) : (
            <p className="empty-state">No requests here yet.</p>
          )}
        </div>
        <div className="panel">
          {current ? (
            <>
              <div className="support-toolbar">
                <div>
                  <span className="eyebrow">REQUEST #{current.ticket_id}</span>
                  <h2>{current.subject}</h2>
                </div>
                {customer ? (
                  <span className="badge">{current.status}</span>
                ) : (
                  <select
                    aria-label="Update ticket status"
                    disabled={busy}
                    value={current.status}
                    onChange={(e) => status(e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="ticket-messages">
                {messages.map((m) => (
                  <article className="message" key={m.message_id}>
                    <small>{m.author_type}</small>
                    {m.body}
                  </article>
                ))}
              </div>
              <form className="ticket-form" onSubmit={send}>
                <label>
                  Reply
                  <textarea
                    rows={3}
                    required
                    maxLength={10000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </label>
                <button
                  className="primary-button"
                  disabled={busy || !reply.trim()}
                >
                  Send reply
                </button>
                {customer &&
                  ["Resolved", "Closed"].includes(current.status) && (
                    <p className="notice">
                      Sending a reply reopens this request.
                    </p>
                  )}
              </form>
            </>
          ) : (
            <p className="empty-state">
              Select a request to read the conversation.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
