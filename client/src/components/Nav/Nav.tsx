import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Target,
  Handshake,
  ListTodo,
  Building2,
  Shield,
  Layers,
  Contact,
  PanelLeftClose,
  Menu,
  LogOut,
  KeyRound,
  LifeBuoy,
  UserRound,
  ChartNoAxesCombined,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { GetEntity } from "../../utils/api";
import { axios } from "../../utils/axios";
import "./Nav.css";
const groups = [
  {
    name: "Workspace",
    items: [
      ["/", "Overview", LayoutDashboard],
      ["/crm/leads", "Leads", Target],
      ["/crm/customers", "Customers", Users],
      ["/crm/deals", "Deals & pipeline", Handshake],
      ["/crm/activities", "Activities", ListTodo],
      ["/crm/support", "Customer support", LifeBuoy],
      ["/crm/reports", "Reports & insights", ChartNoAxesCombined],
    ],
  },
  {
    name: "Administration",
    items: [
      ["/entity", "Entities", Building2],
      ["/branch", "Branches", Layers],
      ["/roles", "Roles & permissions", Shield],
      ["/designation", "Designations", Contact],
      ["/users", "Team access", Users],
      ["/pages", "Pages master", Layers],
    ],
  },
] as const;
export default function Nav() {
  const {
    user,
    signout,
    pageAccess,
    branchAccess,
    currentBranch,
    setcurrentBranch,
    currentEntity,
    setccurrentEntity,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [entities, setEntities] = useState<
    { entity_id: number; name: string }[]
  >([]);
  const navigate = useNavigate();
  useEffect(() => {
    if (user?.is_superadmin)
      GetEntity()
        .then((r) => setEntities(r.data?.data || []))
        .catch(() => setEntities([]));
  }, [user?.is_superadmin]);
  if (!user) return null;
  const allowed = (url: string) =>
    url === "/" ||
    user.is_superadmin === 1 ||
    pageAccess.some((p) => p.url === url) ||
    ((url === "/crm/support" || url === "/crm/reports") && user.is_admin === 1);
  async function logout() {
    try {
      await axios.post("/user/logout", {
        user_name: user?.user_name,
        entity_id: user?.entity_id,
      });
    } finally {
      signout(() => navigate("/login"));
    }
  }
  return (
    <>
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu size={20} />
      </button>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <NavLink to="/" className="wordmark" onClick={() => setOpen(false)}>
          <span className="brand-mark">m.</span>
          <span>
            matrika<span className="brand-caption">CUSTOMER RELATIONSHIPS</span>
          </span>
        </NavLink>
        <button
          className="mobile-close"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <PanelLeftClose size={20} />
        </button>
        <div className="workspace-label">
          <span className="status-dot" /> Matrika Technology
          <small>Bangalore workspace</small>
        </div>
        <nav>
          {groups.map((g) => (
            <section key={g.name}>
              <p className="nav-section-label">{g.name}</p>
              {g.items
                .filter(([url]) => allowed(url))
                .map(([url, label, Icon]) => (
                  <NavLink
                    end={url === "/"}
                    key={url}
                    to={url}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink className="nav-item" to="/profile">
            <UserRound size={18} />
            My profile
          </NavLink>
          <NavLink className="nav-item" to="/changePassword">
            <KeyRound size={18} />
            Change password
          </NavLink>
          <button className="nav-item" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
          <div className="user-chip">
            <span>
              {(user.full_name || user.user_name).slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.full_name || user.user_name}</strong>
              <small>{user.role_name}</small>
            </div>
          </div>
        </div>
      </aside>
      <header className="workspace-bar">
        <div>
          <span className="eyebrow">MATRIKA CRM</span>
          <p>Every relationship, in focus.</p>
        </div>
        <div className="workspace-selectors">
          {user.is_superadmin === 1 && (
            <label>
              Entity
              <select
                value={currentEntity || ""}
                onChange={(e) => setccurrentEntity(Number(e.target.value))}
              >
                <option value="" disabled>
                  Select entity
                </option>
                {entities.map((e) => (
                  <option key={e.entity_id} value={e.entity_id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Branch
            <select
              value={currentBranch || ""}
              onChange={(e) => setcurrentBranch(Number(e.target.value))}
            >
              <option value="" disabled>
                Select branch
              </option>
              {branchAccess
                .filter((b) => b.is_active !== 0)
                .map((b) => (
                  <option key={b.branch_id} value={b.branch_id || ""}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </header>
    </>
  );
}
