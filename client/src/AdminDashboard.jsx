import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { LogOut, RefreshCw, Search, Server } from "lucide-react";

const REVOKE_ACTION_PRODUCT_CODE = "__REVOKE__";

const tableContainerSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
  overflow: "hidden",
  "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even) .MuiTableCell-root":
    {
      backgroundColor: "#FCFCFD",
    },
  "& .MuiTableBody-root .MuiTableRow-root:hover .MuiTableCell-root": {
    backgroundColor: "#F9FAFB",
  },
};

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
  const [notice, setNotice] = useState({ message: "", severity: "info" });

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
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

  const token = useMemo(() => localStorage.getItem("adminToken"), []);
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const revokeActions = useMemo(
    () => actions.filter((a) => a.product_code === REVOKE_ACTION_PRODUCT_CODE),
    [actions],
  );

  const setNoticeMessage = (message, severity = "info") => {
    setNotice({ message, severity });
  };

  const money = (value) => {
    const n = Number(value || 0);
    return `INR ${n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const rankTypeChip = (rankType) => {
    const normalized = String(rankType || "").toLowerCase();
    if (normalized.includes("sub")) {
      return { label: "Subscription", color: "warning" };
    }
    if (normalized.includes("perm")) {
      return { label: "Permanent", color: "info" };
    }
    return { label: rankType || "Unknown", color: "default" };
  };

  const loadDashboard = async ({ preserveNotice = false } = {}) => {
    setBusy(true);
    if (!preserveNotice) {
      setNotice({ message: "", severity: "info" });
    }

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
        setNoticeMessage(
          "Dashboard loaded, but proxy server data is currently unavailable.",
          "warning",
        );
      }
    } catch (err) {
      setNoticeMessage(
        err?.response?.data?.error || "Failed to load dashboard data",
        "error",
      );
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
      setNoticeMessage("Proxy connectivity test completed", "success");
    } catch (e) {
      setProxyStatus({
        status: "offline",
        error: e?.response?.data?.error || e?.message || "Proxy test failed",
      });
      setNoticeMessage("Proxy connectivity test failed", "error");
    }
  };

  const searchPlayer = async () => {
    try {
      const q = searchInput.trim();
      if (!q) {
        setSearchRows([]);
        setNoticeMessage("Enter a username to search.", "warning");
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
      setNotice({ message: "", severity: "info" });
    } catch (e) {
      setNoticeMessage(e?.response?.data?.error || "Search failed", "error");
    }
  };

  const manualGrant = async () => {
    try {
      const username = grantForm.username.trim();
      const productCode = grantForm.productCode.trim();

      if (!username || !productCode) {
        setNoticeMessage(
          "Please enter username and select a product",
          "warning",
        );
        return;
      }

      const ok = window.confirm(
        `Confirm manual grant for ${username} with product ${productCode}?`,
      );
      if (!ok) return;

      const { data } = await axios.post(
        `${apiBaseUrl}/api/admin/manual/grant`,
        { username, productCode },
        { headers: authHeaders },
      );

      if (data?.warning) {
        setNoticeMessage(
          `Manual grant saved (${data?.orderId || "manual_id"}). ${data.warning}`,
          "warning",
        );
      } else if (data?.dispatched) {
        setNoticeMessage(
          `Manual grant applied (${data?.orderId || "manual_id"}) and dispatched to proxy`,
          "success",
        );
      } else {
        setNoticeMessage(
          `Manual grant saved (${data?.orderId || "manual_id"})`,
          "info",
        );
      }

      setGrantForm({ username: "", productCode: "" });
      await loadDashboard({ preserveNotice: true });
    } catch (e) {
      setNoticeMessage(
        e?.response?.data?.error || "Manual grant failed",
        "error",
      );
    }
  };

  const manualRevoke = async () => {
    try {
      const username = revokeForm.username.trim();
      if (!username) {
        setNoticeMessage("Please enter username for revoke", "warning");
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
        { headers: authHeaders },
      );

      if (data?.warning) {
        setNoticeMessage(`Rank revoked. ${data.warning}`, "warning");
      } else if (data?.dispatched) {
        setNoticeMessage(
          `Manual revoke applied and revoke action dispatched (${data?.orderId || "revoke_id"})`,
          "success",
        );
      } else {
        setNoticeMessage("Manual revoke applied", "info");
      }

      setRevokeForm({
        username: "",
        applyRevokeActions: true,
        revokeActionId: "",
      });
      await loadDashboard({ preserveNotice: true });
    } catch (e) {
      setNoticeMessage(
        e?.response?.data?.error || "Manual revoke failed",
        "error",
      );
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
      setNoticeMessage("Postpurchase action saved", "success");
      await loadDashboard({ preserveNotice: true });
    } catch (e) {
      setNoticeMessage(
        e?.response?.data?.error || "Failed to save action",
        "error",
      );
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
      setNoticeMessage("Action deleted", "info");
      await loadDashboard({ preserveNotice: true });
    } catch (e) {
      setNoticeMessage(
        e?.response?.data?.error || "Failed to delete action",
        "error",
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin");
  };

  const renderEmptyRow = (colSpan, message) => (
    <TableRow>
      <TableCell colSpan={colSpan} align="center">
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </TableCell>
    </TableRow>
  );

  const proxyOnline = proxyStatus?.status === "online";

  return (
    <Box
      sx={{ py: 4, minHeight: "100vh", backgroundColor: "background.default" }}
    >
      <Container maxWidth="xl">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            mb: 3,
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
          }}
        >
          <Box>
            <Typography variant="h4">Admin Dashboard</Typography>
            <Typography color="text.secondary">
              Manage purchases, subscriptions, rank ownership, and proxy
              actions.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button
              variant="outlined"
              color="error"
              onClick={logout}
              startIcon={<LogOut size={16} />}
            >
              Logout
            </Button>
          </Stack>
        </Stack>

        {notice.message ? (
          <Alert
            sx={{ mb: 3 }}
            severity={notice.severity}
            onClose={() => setNotice({ message: "", severity: "info" })}
          >
            {notice.message}
          </Alert>
        ) : null}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                height: "100%",
                borderTop: "4px solid",
                borderTopColor: "success.main",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" variant="subtitle2">
                  Today Revenue
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {money(summary.todayRevenue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                height: "100%",
                borderTop: "4px solid",
                borderTopColor: "info.main",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" variant="subtitle2">
                  7 Days Revenue
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {money(summary.revenue7d)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                height: "100%",
                borderTop: "4px solid",
                borderTopColor: "warning.main",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" variant="subtitle2">
                  30 Days Revenue
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {money(summary.revenue30d)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ mb: 3, p: 1.25 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "stretch", md: "center" } }}
          >
            <Tabs
              value={tab}
              onChange={(_event, value) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ flexGrow: 1 }}
            >
              <Tab value="overview" label="Overview" />
              <Tab value="subscriptions" label="Subscriptions" />
              <Tab value="permanent" label="Permanent Ranks" />
              <Tab value="actions" label="Postpurchase Actions" />
              <Tab value="tools" label="Tools" />
            </Tabs>
            <Button
              variant="outlined"
              onClick={() => loadDashboard()}
              disabled={busy}
              startIcon={<RefreshCw size={16} />}
            >
              Refresh Data
            </Button>
          </Stack>
        </Paper>

        {tab === "overview" && (
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.5} sx={{ height: "100%" }}>
                      <Typography variant="h6">Proxy Connectivity</Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", flexWrap: "wrap" }}
                      >
                        <Server size={18} />
                        <Chip
                          label={proxyOnline ? "Online" : "Offline"}
                          color={proxyOnline ? "success" : "error"}
                          size="small"
                        />
                        <Chip
                          label={`${proxyServers.length} server${proxyServers.length === 1 ? "" : "s"}`}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Check proxy health before dispatching grant or revoke
                        actions.
                      </Typography>
                      {proxyStatus?.error ? (
                        <Alert severity="error">{proxyStatus.error}</Alert>
                      ) : null}
                      <Box sx={{ mt: "auto" }}>
                        <Button
                          variant="contained"
                          color="info"
                          onClick={testProxy}
                        >
                          Run Connectivity Test
                        </Button>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.5} sx={{ height: "100%" }}>
                      <Typography variant="h6">Registered Servers</Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap", minHeight: 70 }}
                      >
                        {proxyServers.slice(0, 8).map((serverName) => (
                          <Chip
                            key={serverName}
                            label={serverName}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        ))}
                        {proxyServers.length > 8 ? (
                          <Chip
                            label={`+${proxyServers.length - 8} more`}
                            size="small"
                            variant="outlined"
                          />
                        ) : null}
                        {proxyServers.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No servers available from proxy.
                          </Typography>
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Server names are fetched from the proxy service and used
                        in postpurchase action routing.
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Search Player</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField
                      placeholder="Enter username"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      onClick={searchPlayer}
                      startIcon={<Search size={16} />}
                    >
                      Search Player
                    </Button>
                  </Stack>

                  <TableContainer sx={tableContainerSx}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Username</TableCell>
                          <TableCell>Rank</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchRows.map((row) => {
                          const typeInfo = rankTypeChip(row.rank_type);
                          return (
                            <TableRow
                              key={`${row.username}-${row.purchase_date}-${row.purchase_time}`}
                            >
                              <TableCell>{row.username}</TableCell>
                              <TableCell>{row.rank}</TableCell>
                              <TableCell>
                                <Chip
                                  label={typeInfo.label}
                                  size="small"
                                  color={typeInfo.color}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {String(row.purchase_date || "")}
                              </TableCell>
                              <TableCell>
                                {String(row.purchase_time || "")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {searchRows.length === 0
                          ? renderEmptyRow(5, "No results")
                          : null}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}

        {tab === "subscriptions" && (
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Active Subscriptions
                </Typography>
                <TableContainer sx={tableContainerSx}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Rank</TableCell>
                        <TableCell>Purchased At</TableCell>
                        <TableCell>Expires At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeSubs.map((row) => (
                        <TableRow
                          key={`${row.username}-${row.purchase_date}-${row.purchase_time}`}
                        >
                          <TableCell>{row.username}</TableCell>
                          <TableCell>{row.rank}</TableCell>
                          <TableCell>
                            {String(row.purchased_at || "")}
                          </TableCell>
                          <TableCell>{String(row.expires_at || "")}</TableCell>
                        </TableRow>
                      ))}
                      {activeSubs.length === 0
                        ? renderEmptyRow(4, "No active subscriptions")
                        : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Expired Subscriptions
                </Typography>
                <TableContainer sx={tableContainerSx}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Rank</TableCell>
                        <TableCell>Purchased Date</TableCell>
                        <TableCell>Purchased Time</TableCell>
                        <TableCell>Expired At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expiredSubs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.username}</TableCell>
                          <TableCell>{row.rank}</TableCell>
                          <TableCell>
                            {String(row.purchase_date || "")}
                          </TableCell>
                          <TableCell>
                            {String(row.purchase_time || "")}
                          </TableCell>
                          <TableCell>{String(row.expired_at || "")}</TableCell>
                        </TableRow>
                      ))}
                      {expiredSubs.length === 0
                        ? renderEmptyRow(6, "No expired subscriptions yet")
                        : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        )}

        {tab === "permanent" && (
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Typography variant="h6">Active Permanent Ranks</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  This list includes only current ownership. Revoked users are
                  excluded.
                </Typography>
                <TableContainer sx={tableContainerSx}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Rank</TableCell>
                        <TableCell>Purchased Date</TableCell>
                        <TableCell>Purchased Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activePermanentRanks.map((row) => (
                        <TableRow
                          key={`${row.username}-${row.purchase_date}-${row.purchase_time}`}
                        >
                          <TableCell>{row.username}</TableCell>
                          <TableCell>{row.rank}</TableCell>
                          <TableCell>
                            {String(row.purchase_date || "")}
                          </TableCell>
                          <TableCell>
                            {String(row.purchase_time || "")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {activePermanentRanks.length === 0
                        ? renderEmptyRow(4, "No active permanent ranks found")
                        : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Permanent Rank Purchase Log
                </Typography>
                <TableContainer sx={tableContainerSx}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Rank</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Paid At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {permanentPurchases.map((row) => (
                        <TableRow key={row.order_id}>
                          <TableCell>{row.order_id}</TableCell>
                          <TableCell>{row.username}</TableCell>
                          <TableCell>{row.product_code}</TableCell>
                          <TableCell>{row.rank}</TableCell>
                          <TableCell>
                            {money(row.amount)} {row.currency || "INR"}
                          </TableCell>
                          <TableCell>{String(row.paid_at || "")}</TableCell>
                        </TableRow>
                      ))}
                      {permanentPurchases.length === 0
                        ? renderEmptyRow(6, "No permanent rank purchases yet")
                        : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        )}

        {tab === "actions" && (
          <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
            <Grid size={{ xs: 12, xl: 5 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">
                      {actionForm.id ? "Edit" : "Create"} Postpurchase Action
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={actionForm.isRevokeAction}
                          onChange={(e) =>
                            setActionForm((prev) => ({
                              ...prev,
                              isRevokeAction: e.target.checked,
                              productCode: e.target.checked
                                ? REVOKE_ACTION_PRODUCT_CODE
                                : "",
                            }))
                          }
                        />
                      }
                      label="Run as revoke action"
                    />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minHeight: 40 }}
                    >
                      {actionForm.isRevokeAction
                        ? "Revoke actions execute during manual rank revokes."
                        : "Grant actions execute after successful purchase events."}
                    </Typography>

                    <FormControl
                      fullWidth
                      size="small"
                      disabled={actionForm.isRevokeAction}
                    >
                      <InputLabel id="action-product-label">Product</InputLabel>
                      <Select
                        labelId="action-product-label"
                        value={
                          actionForm.isRevokeAction
                            ? ""
                            : actionForm.productCode
                        }
                        label="Product"
                        onChange={(e) =>
                          setActionForm((prev) => ({
                            ...prev,
                            productCode: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">
                          <em>Select product</em>
                        </MenuItem>
                        {products.map((product) => (
                          <MenuItem key={product.code} value={product.code}>
                            {product.displayName || product.code}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel id="action-server-label">Server</InputLabel>
                      <Select
                        labelId="action-server-label"
                        value={actionForm.serverName}
                        label="Server"
                        onChange={(e) =>
                          setActionForm((prev) => ({
                            ...prev,
                            serverName: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">
                          <em>Select server</em>
                        </MenuItem>
                        {proxyServers.map((serverName) => (
                          <MenuItem key={serverName} value={serverName}>
                            {serverName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ minHeight: 52 }}>
                      {proxyServers.length === 0 ? (
                        <Alert severity="warning">
                          No servers received from proxy. Validate proxy
                          connectivity first.
                        </Alert>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Commands are dispatched to the selected proxy server.
                        </Typography>
                      )}
                    </Box>

                    <TextField
                      label="Commands (one per line)"
                      placeholder="lp user {username} parent add {rank}"
                      multiline
                      minRows={6}
                      value={actionForm.commandsText}
                      onChange={(e) =>
                        setActionForm((prev) => ({
                          ...prev,
                          commandsText: e.target.value,
                        }))
                      }
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={actionForm.isActive}
                          onChange={(e) =>
                            setActionForm((prev) => ({
                              ...prev,
                              isActive: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Action active"
                    />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                    >
                      <Button
                        variant="contained"
                        color={
                          actionForm.isRevokeAction ? "warning" : "primary"
                        }
                        onClick={saveAction}
                        disabled={
                          (!actionForm.isRevokeAction &&
                            products.length === 0) ||
                          proxyServers.length === 0
                        }
                      >
                        Save Action
                      </Button>
                      <Button
                        variant="outlined"
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
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, xl: 7 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Saved Postpurchase Actions
                  </Typography>
                  <TableContainer sx={tableContainerSx}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Server</TableCell>
                          <TableCell>Commands</TableCell>
                          <TableCell>Active</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {actions.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.id}</TableCell>
                            <TableCell>{row.product_code}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={
                                  row.product_code ===
                                  REVOKE_ACTION_PRODUCT_CODE
                                    ? "Revoke"
                                    : "Grant"
                                }
                                color={
                                  row.product_code ===
                                  REVOKE_ACTION_PRODUCT_CODE
                                    ? "warning"
                                    : "info"
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{row.server_name}</TableCell>
                            <TableCell>
                              <Box
                                component="pre"
                                sx={{
                                  m: 0,
                                  whiteSpace: "pre-wrap",
                                  fontFamily: "inherit",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {row.commands_text}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={row.is_active ? "Active" : "Inactive"}
                                size="small"
                                color={row.is_active ? "success" : "default"}
                                variant={row.is_active ? "filled" : "outlined"}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => editAction(row)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => deleteAction(row.id)}
                                >
                                  Delete
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                        {actions.length === 0
                          ? renderEmptyRow(
                              7,
                              "No postpurchase actions configured",
                            )
                          : null}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {tab === "tools" && (
          <Card>
            <CardContent>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h6">Manual Rank Tools</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use these tools for direct rank changes outside automatic
                    checkout flow.
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, height: "100%", backgroundColor: "#FCFCFD" }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="subtitle1">
                          Manual Grant
                        </Typography>

                        <TextField
                          size="small"
                          label="Username"
                          value={grantForm.username}
                          onChange={(e) =>
                            setGrantForm((prev) => ({
                              ...prev,
                              username: e.target.value,
                            }))
                          }
                        />

                        <FormControl fullWidth size="small">
                          <InputLabel id="grant-product-label">
                            Product
                          </InputLabel>
                          <Select
                            labelId="grant-product-label"
                            label="Product"
                            value={grantForm.productCode}
                            onChange={(e) =>
                              setGrantForm((prev) => ({
                                ...prev,
                                productCode: e.target.value,
                              }))
                            }
                          >
                            <MenuItem value="">
                              <em>Select product</em>
                            </MenuItem>
                            {products.map((product) => (
                              <MenuItem key={product.code} value={product.code}>
                                {product.displayName || product.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <Button
                          variant="contained"
                          color="success"
                          onClick={manualGrant}
                        >
                          Grant Rank
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, height: "100%", backgroundColor: "#FCFCFD" }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="subtitle1">
                          Manual Revoke
                        </Typography>
                        <Alert severity="warning">
                          Use revoke only when you need to remove an active rank
                          from a user.
                        </Alert>

                        <TextField
                          size="small"
                          label="Username"
                          value={revokeForm.username}
                          onChange={(e) =>
                            setRevokeForm((prev) => ({
                              ...prev,
                              username: e.target.value,
                            }))
                          }
                        />

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={revokeForm.applyRevokeActions}
                              onChange={(e) =>
                                setRevokeForm((prev) => ({
                                  ...prev,
                                  applyRevokeActions: e.target.checked,
                                  revokeActionId: e.target.checked
                                    ? prev.revokeActionId
                                    : "",
                                }))
                              }
                            />
                          }
                          label="Apply revoke action"
                        />

                        {revokeForm.applyRevokeActions ? (
                          <FormControl fullWidth size="small">
                            <InputLabel id="revoke-option-label">
                              Revoke Option
                            </InputLabel>
                            <Select
                              labelId="revoke-option-label"
                              label="Revoke Option"
                              value={revokeForm.revokeActionId}
                              onChange={(e) =>
                                setRevokeForm((prev) => ({
                                  ...prev,
                                  revokeActionId: e.target.value,
                                }))
                              }
                            >
                              <MenuItem value="">
                                <em>All configured revoke actions</em>
                              </MenuItem>
                              {revokeActions.map((action) => (
                                <MenuItem
                                  key={action.id}
                                  value={String(action.id)}
                                >
                                  #{action.id} on {action.server_name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ minHeight: 40 }} />
                        )}

                        <Button
                          variant="contained"
                          color="error"
                          onClick={manualRevoke}
                        >
                          Revoke Rank
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default AdminDashboard;
