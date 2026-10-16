import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>My profile</h1>
          <p>Your workspace identity and access.</p>
        </div>
      </div>
      <section className="panel">
        <h2>{user?.full_name}</h2>
        <div className="data-row">
          <span>Email address</span>
          <strong>{user?.user_name}</strong>
        </div>
        <div className="data-row">
          <span>Role</span>
          <span className="badge">{user?.role_name}</span>
        </div>
        <p className="notice">
          Contact your administrator to update your account details.
        </p>
        <Link className="secondary-button" to="/changePassword">
          Change password
        </Link>
      </section>
    </>
  );
}
