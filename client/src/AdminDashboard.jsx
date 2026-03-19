import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles/admin-dashboard.css";

const REVOKE_ACTION_PRODUCT_CODE = "__REVOKE__";

const AdminDashboard = () => {
  const [summary, setSummary] = useState({
    todayRevenue: 0,
    revenue7d: 0,
    revenue30d: 0,
  });
  const [activeSubs, setActiveSubs] = useState([]);
  const [expiredSubs, setExpiredSubs] = useState([]);
  const [activePermanentRanks, setActivePermanentRanks] = useState([]);
  const [permanentPurchases, setPermanentPurchases] = useState([]);
  const [proxyStatus, setProxyStatus] = useState({ status: "checking" });
  const [proxyServers, setProxyServers] = useState([]);
  const [products, setProducts] = useState([]);
  const [actions, setActions] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchRows, setSearchRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [grantForm, setGrantForm] = useState({ username: "", productCode: "" });
  const [revokeForm, setRevokeForm] = useState({
    username: "",
    applyRevokeActions: true,
    revokeActionId: "",
  });
  const [actionForm, setActionForm] = useState({
    id: null,
    productCode: "",
    serverName: "",
    commandsText: "",
    isActive: true,
    isRevokeAction: false,
  });

  const [tab, setTab] = useState("overview");

  const navigate = useNavigate();
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const token = useMemo(() => localStorage.getItem("adminToken"), []);
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const revokeActions = useMemo(
    () => actions.filter((a) => a.product_code === REVOKE_ACTION_PRODUCT_CODE),
    [actions],
  );

  const money = (v) => {
    const n = Number(v || 0);
    return `₹${n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const loadDashboard = async () => {
    setBusy(true);
    setNotice("");
    try {
      const [
        sumRes,
        activeRes,
        expiredRes,
        permanentRes,
        activePermanentRes,
        productRes,
        actionRes,
      ] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/admin/dashboard/summary`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/subscriptions/active`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/subscriptions/expired`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/purchases/permanent`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/ranks/permanent/active`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/products`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/postpurchase-actions`, {
          headers: authHeaders,
        }),
      ]);

      setSummary(sumRes.data || {});
      setActiveSubs(activeRes.data || []);
      setExpiredSubs(expiredRes.data || []);
      setPermanentPurchases(permanentRes.data || []);
      setActivePermanentRanks(activePermanentRes.data || []);
      setProducts(productRes.data?.products || []);
      setActions(actionRes.data || []);

      try {
        const [statusRes, serverRes] = await Promise.all([
          axios.get(`${apiBaseUrl}/api/admin/proxy/status`, {
            headers: authHeaders,
          }),
          axios.get(`${apiBaseUrl}/api/admin/proxy/servers`, {
            headers: authHeaders,
          }),
        ]);
        setProxyStatus(statusRes.data || { status: "unknown" });
        setProxyServers(serverRes.data?.servers || []);
      } catch (_proxyErr) {
        setProxyStatus({ status: "offline", error: "Proxy unavailable" });
        setProxyServers([]);
      }
    } catch (err) {
      console.error(err);
      setNotice(err?.response?.data?.error || "Failed to load dashboard data");
      if (err?.response?.status === 401) navigate("/admin");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    loadDashboard();
  }, [navigate, token]);

  const testProxy = async () => {
    try {
      const { data } = await axios.post(
        `${apiBaseUrl}/api/admin/proxy/test`,
        {},
        { headers: authHeaders },
      );
      setProxyStatus(data || {});
      setNotice("Proxy connectivity test completed");
    } catch (e) {
      setProxyStatus({
        status: "offline",
        error: e?.response?.data?.error || e?.message || "Proxy test failed",
      });
      setNotice("Proxy connectivity test failed");
    }
  };

  const searchPlayer = async () => {
    try {
      const q = searchInput.trim();
      if (!q) {
        setSearchRows([]);
        return;
      }
      const { data } = await axios.get(
        `${apiBaseUrl}/api/admin/players/search`,
        {
          headers: authHeaders,
          params: { username: q },
        },
      );
      setSearchRows(data || []);
    } catch (e) {
      setNotice(e?.response?.data?.error || "Search failed");
    }
  };

  const manualGrant = async () => {
    try {
      const username = grantForm.username.trim();
      const productCode = grantForm.productCode.trim();
      if (!username || !productCode) {
        setNotice("Please enter username and select a product");
        return;
      }

      const ok = window.confirm(
        `Confirm manual grant for ${username} with product ${productCode}?`,
      );
      if (!ok) return;

      const { data } = await axios.post(
        `${apiBaseUrl}/api/admin/manual/grant`,
        { username, productCode },
        {
          headers: authHeaders,
        },
      );

      if (data?.warning) {
        setNotice(
          `Manual grant saved (${data?.orderId || "manual_id"}). ${data.warning}`,
        );
      } else if (data?.dispatched) {
        setNotice(
          `Manual grant applied (${data?.orderId || "manual_id"}) and dispatched to proxy`,
        );
      } else {
        setNotice(`Manual grant saved (${data?.orderId || "manual_id"})`);
      }

      setGrantForm({ username: "", productCode: "" });
      loadDashboard();
    } catch (e) {
      setNotice(e?.response?.data?.error || "Manual grant failed");
    }
  };

  const manualRevoke = async () => {
    try {
      const username = revokeForm.username.trim();
      if (!username) {
        setNotice("Please enter username for revoke");
        return;
      }

      const ok = window.confirm(
        `Confirm revoke rank for ${username}? This removes current ownership.`,
      );
      if (!ok) return;

      const { data } = await axios.post(
        `${apiBaseUrl}/api/admin/manual/revoke`,
        {
          username,
          applyRevokeActions: revokeForm.applyRevokeActions,
          revokeActionId: revokeForm.revokeActionId
            ? Number(revokeForm.revokeActionId)
            : null,
        },
        {
          headers: authHeaders,
        },
      );

      if (data?.warning) {
        setNotice(`Rank revoked. ${data.warning}`);
      } else if (data?.dispatched) {
        setNotice(
          `Manual revoke applied and revoke action dispatched (${data?.orderId || "revoke_id"})`,
        );
      } else {
        setNotice("Manual revoke applied");
      }

      setRevokeForm({
        username: "",
        applyRevokeActions: true,
        revokeActionId: "",
      });
      loadDashboard();
    } catch (e) {
      setNotice(e?.response?.data?.error || "Manual revoke failed");
    }
  };

  const saveAction = async () => {
    try {
      const payload = {
        ...actionForm,
        productCode: actionForm.isRevokeAction
          ? REVOKE_ACTION_PRODUCT_CODE
          : actionForm.productCode,
      };

      if (actionForm.id) {
        await axios.put(
          `${apiBaseUrl}/api/admin/postpurchase-actions/${actionForm.id}`,
          payload,
          { headers: authHeaders },
        );
      } else {
        await axios.post(
          `${apiBaseUrl}/api/admin/postpurchase-actions`,
          payload,
          {
            headers: authHeaders,
          },
        );
      }

      setActionForm({
        id: null,
        productCode: "",
        serverName: "",
        commandsText: "",
        isActive: true,
        isRevokeAction: false,
      });
      setNotice("Postpurchase action saved");
      loadDashboard();
    } catch (e) {
      setNotice(e?.response?.data?.error || "Failed to save action");
    }
  };

  const editAction = (row) => {
    setActionForm({
      id: row.id,
      productCode: row.product_code,
      serverName: row.server_name,
      commandsText: row.commands_text,
      isActive: !!row.is_active,
      isRevokeAction: row.product_code === REVOKE_ACTION_PRODUCT_CODE,
    });
    setTab("actions");
  };

  const deleteAction = async (id) => {
    try {
      await axios.delete(`${apiBaseUrl}/api/admin/postpurchase-actions/${id}`, {
        headers: authHeaders,
      });
      setNotice("Action deleted");
      loadDashboard();
    } catch (e) {
      setNotice(e?.response?.data?.error || "Failed to delete action");
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin");
  };

  return (
    <div className="admin-shell">
      <div className="admin-topbar container-fluid">
        <h2 className="admin-title">Admin Control Center</h2>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-light"
            onClick={loadDashboard}
            disabled={busy}
          >
            Refresh
          </button>
          <button className="btn btn-danger" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container-fluid pb-4">
        {notice ? <div className="alert alert-info mt-3">{notice}</div> : null}

        <div className="admin-kpis row g-3 mt-1">
          <div className="col-12 col-md-4">
            <div className="kpi-card">
              <p>Today Revenue</p>
              <h3>{money(summary.todayRevenue)}</h3>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="kpi-card">
              <p>7 Days Revenue</p>
              <h3>{money(summary.revenue7d)}</h3>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="kpi-card">
              <p>30 Days Revenue</p>
              <h3>{money(summary.revenue30d)}</h3>
            </div>
          </div>
        </div>

        <div className="admin-tabs mt-4">
          {[
            ["overview", "Overview"],
            ["subscriptions", "Subscriptions"],
            ["permanent", "Permanent Ranks"],
            ["actions", "Postpurchase Actions"],
            ["tools", "Tools"],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`admin-tab ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="row g-3 mt-2">
            <div className="col-12 col-lg-5">
              <div className="admin-card h-100">
                <h5>Proxy Connectivity</h5>
                <p>
                  Status:{" "}
                  <strong
                    className={
                      proxyStatus?.status === "online"
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {proxyStatus?.status || "unknown"}
                  </strong>
                </p>
                {proxyStatus?.error ? (
                  <p className="text-danger mb-2">{proxyStatus.error}</p>
                ) : null}
                <button className="btn btn-primary" onClick={testProxy}>
                  Run Connectivity Test
                </button>
              </div>
            </div>
            <div className="col-12 col-lg-7">
              <div className="admin-card h-100">
                <h5>Search Player</h5>
                <div className="d-flex gap-2 mb-3">
                  <input
                    className="form-control"
                    placeholder="Enter username"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={searchPlayer}>
                    Search
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Rank</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchRows.map((r) => (
                        <tr
                          key={`${r.username}-${r.purchase_date}-${r.purchase_time}`}
                        >
                          <td>{r.username}</td>
                          <td>{r.rank}</td>
                          <td>{r.rank_type}</td>
                          <td>{String(r.purchase_date || "")}</td>
                          <td>{String(r.purchase_time || "")}</td>
                        </tr>
                      ))}
                      {searchRows.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center text-muted">
                            No results
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "subscriptions" && (
          <div className="row g-3 mt-2">
            <div className="col-12">
              <div className="admin-card">
                <h5>Active Subscriptions</h5>
                <div className="table-responsive">
                  <table className="table table-striped table-bordered">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Rank</th>
                        <th>Purchased At</th>
                        <th>Expires At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSubs.map((r) => (
                        <tr
                          key={`${r.username}-${r.purchase_date}-${r.purchase_time}`}
                        >
                          <td>{r.username}</td>
                          <td>{r.rank}</td>
                          <td>{String(r.purchased_at || "")}</td>
                          <td>{String(r.expires_at || "")}</td>
                        </tr>
                      ))}
                      {activeSubs.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center text-muted">
                            No active subscriptions
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="admin-card">
                <h5>Expired Subscriptions</h5>
                <div className="table-responsive">
                  <table className="table table-striped table-bordered">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Rank</th>
                        <th>Purchased Date</th>
                        <th>Purchased Time</th>
                        <th>Expired At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiredSubs.map((r) => (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{r.username}</td>
                          <td>{r.rank}</td>
                          <td>{String(r.purchase_date || "")}</td>
                          <td>{String(r.purchase_time || "")}</td>
                          <td>{String(r.expired_at || "")}</td>
                        </tr>
                      ))}
                      {expiredSubs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted">
                            No expired subscriptions yet
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "permanent" && (
          <div className="row g-3 mt-2">
            <div className="col-12">
              <div className="admin-card">
                <h5>Active Permanent Ranks (Current Owners)</h5>
                <p className="text-muted mb-2">
                  This list is from active ownership only. Revoked users are not
                  shown.
                </p>
                <div className="table-responsive">
                  <table className="table table-striped table-bordered">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Rank</th>
                        <th>Purchased Date</th>
                        <th>Purchased Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePermanentRanks.map((r) => (
                        <tr
                          key={`${r.username}-${r.purchase_date}-${r.purchase_time}`}
                        >
                          <td>{r.username}</td>
                          <td>{r.rank}</td>
                          <td>{String(r.purchase_date || "")}</td>
                          <td>{String(r.purchase_time || "")}</td>
                        </tr>
                      ))}
                      {activePermanentRanks.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center text-muted">
                            No active permanent ranks found
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="admin-card">
                <h5>Permanent Rank Purchases (Transaction Log)</h5>
                <div className="table-responsive">
                  <table className="table table-striped table-bordered">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Username</th>
                        <th>Product</th>
                        <th>Rank</th>
                        <th>Amount</th>
                        <th>Paid At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permanentPurchases.map((r) => (
                        <tr key={r.order_id}>
                          <td>{r.order_id}</td>
                          <td>{r.username}</td>
                          <td>{r.product_code}</td>
                          <td>{r.rank}</td>
                          <td>
                            {money(r.amount)} {r.currency || "INR"}
                          </td>
                          <td>{String(r.paid_at || "")}</td>
                        </tr>
                      ))}
                      {permanentPurchases.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted">
                            No permanent rank purchases yet
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "actions" && (
          <div className="row g-3 mt-2">
            <div className="col-12 col-xl-5">
              <div className="admin-card">
                <h5>{actionForm.id ? "Edit" : "Create"} Postpurchase Action</h5>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="action-revoke-mode"
                    checked={actionForm.isRevokeAction}
                    onChange={(e) =>
                      setActionForm((p) => ({
                        ...p,
                        isRevokeAction: e.target.checked,
                        productCode: e.target.checked
                          ? REVOKE_ACTION_PRODUCT_CODE
                          : "",
                      }))
                    }
                  />
                  <label
                    className="form-check-label"
                    htmlFor="action-revoke-mode"
                  >
                    Revoke Action
                  </label>
                </div>
                <p className="text-muted mb-2">
                  {actionForm.isRevokeAction
                    ? "Revoke action applies during manual rank revoke for any user."
                    : "Products are loaded from backend store catalog. Servers are loaded from bungee/proxy."}
                </p>

                <div className="mb-2">
                  <label className="form-label">Product</label>
                  <select
                    className="form-select"
                    value={
                      actionForm.isRevokeAction ? "" : actionForm.productCode
                    }
                    disabled={actionForm.isRevokeAction}
                    onChange={(e) =>
                      setActionForm((p) => ({
                        ...p,
                        productCode: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-2">
                  <label className="form-label">Server</label>
                  <select
                    className="form-select"
                    value={actionForm.serverName}
                    onChange={(e) =>
                      setActionForm((p) => ({
                        ...p,
                        serverName: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select server</option>
                    {proxyServers.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {proxyServers.length === 0 ? (
                    <small className="text-danger">
                      No servers received from proxy. Check proxy connectivity.
                    </small>
                  ) : null}
                </div>

                <div className="mb-2">
                  <label className="form-label">Commands (one per line)</label>
                  <textarea
                    rows="6"
                    className="form-control"
                    value={actionForm.commandsText}
                    onChange={(e) =>
                      setActionForm((p) => ({
                        ...p,
                        commandsText: e.target.value,
                      }))
                    }
                    placeholder="lp user {username} parent add {rank}"
                  />
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="action-active"
                    checked={actionForm.isActive}
                    onChange={(e) =>
                      setActionForm((p) => ({
                        ...p,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="action-active">
                    Action Active
                  </label>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={saveAction}
                    disabled={
                      (!actionForm.isRevokeAction && products.length === 0) ||
                      proxyServers.length === 0
                    }
                  >
                    Save Action
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setActionForm({
                        id: null,
                        productCode: "",
                        serverName: "",
                        commandsText: "",
                        isActive: true,
                        isRevokeAction: false,
                      })
                    }
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-7">
              <div className="admin-card">
                <h5>Saved Postpurchase Actions</h5>
                <div className="table-responsive">
                  <table className="table table-striped table-bordered">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Server</th>
                        <th>Commands</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((row) => (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.product_code}</td>
                          <td>
                            {row.product_code === REVOKE_ACTION_PRODUCT_CODE
                              ? "Revoke"
                              : "Grant"}
                          </td>
                          <td>{row.server_name}</td>
                          <td>
                            <pre className="commands-pre">
                              {row.commands_text}
                            </pre>
                          </td>
                          <td>{row.is_active ? "Yes" : "No"}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => editAction(row)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => deleteAction(row.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {actions.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center text-muted">
                            No postpurchase actions configured
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "tools" && (
          <div className="row g-3 mt-2">
            <div className="col-12 col-xl-6">
              <div className="admin-card">
                <h5>Manual Grant</h5>
                <div className="mb-2">
                  <label className="form-label">Username</label>
                  <input
                    className="form-control"
                    value={grantForm.username}
                    onChange={(e) =>
                      setGrantForm((p) => ({ ...p, username: e.target.value }))
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Product</label>
                  <select
                    className="form-select"
                    value={grantForm.productCode}
                    onChange={(e) =>
                      setGrantForm((p) => ({
                        ...p,
                        productCode: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-success" onClick={manualGrant}>
                  Grant
                </button>
              </div>
            </div>

            <div className="col-12 col-xl-6">
              <div className="admin-card">
                <h5>Manual Revoke</h5>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    className="form-control"
                    value={revokeForm.username}
                    onChange={(e) =>
                      setRevokeForm((p) => ({ ...p, username: e.target.value }))
                    }
                  />
                </div>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="apply-revoke-actions"
                    checked={revokeForm.applyRevokeActions}
                    onChange={(e) =>
                      setRevokeForm((p) => ({
                        ...p,
                        applyRevokeActions: e.target.checked,
                        revokeActionId: e.target.checked
                          ? p.revokeActionId
                          : "",
                      }))
                    }
                  />
                  <label
                    className="form-check-label"
                    htmlFor="apply-revoke-actions"
                  >
                    Apply Revoke Action
                  </label>
                </div>
                {revokeForm.applyRevokeActions ? (
                  <div className="mb-3">
                    <label className="form-label">Revoke Option</label>
                    <select
                      className="form-select"
                      value={revokeForm.revokeActionId}
                      onChange={(e) =>
                        setRevokeForm((p) => ({
                          ...p,
                          revokeActionId: e.target.value,
                        }))
                      }
                    >
                      <option value="">All configured revoke actions</option>
                      {revokeActions.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          #{a.id} on {a.server_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <button className="btn btn-danger" onClick={manualRevoke}>
                  Revoke
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
