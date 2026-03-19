import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles/admin-login.css";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${apiBaseUrl}/api/admin/login`, {
        email: cleanEmail,
        password,
      });
      localStorage.setItem("adminToken", response.data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg-shape admin-login-bg-shape-a" />
      <div className="admin-login-bg-shape admin-login-bg-shape-b" />

      <div className="admin-login-card-wrap">
        <div className="admin-login-brand">
          <p className="admin-login-kicker">MGU Network</p>
          <h1 className="admin-login-title">Admin Control Access</h1>
          <p className="admin-login-subtitle">
            Sign in to manage purchases, actions, subscriptions, and live proxy
            operations.
          </p>
        </div>

        <form className="admin-login-card" onSubmit={handleLogin}>
          <label htmlFor="admin-email" className="admin-login-label">
            Email
          </label>
          <input
            id="admin-email"
            className="admin-login-input"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />

          <label htmlFor="admin-password" className="admin-login-label mt-2">
            Password
          </label>
          <div className="admin-login-password-row">
            <input
              id="admin-password"
              className="admin-login-input"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              className="admin-login-toggle"
              onClick={() => setShowPassword((v) => !v)}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error ? <p className="admin-login-error">{error}</p> : null}

          <button className="admin-login-btn" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
