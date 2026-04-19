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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { LogOut, RefreshCw, Search, Server, Upload } from "lucide-react";

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

const promotionsTableSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  backgroundColor: "background.paper",
  overflowX: "auto",
  "& .MuiTable-root": {
    minWidth: 1180,
    tableLayout: "fixed",
  },
  "& .MuiTableHead-root .MuiTableCell-root": {
    backgroundColor: "#F8FAFC",
    color: "text.secondary",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 1.2,
  },
  "& .MuiTableBody-root .MuiTableCell-root": {
    py: 1.3,
    borderBottom: "1px dashed",
    borderColor: "#E2E8F0",
    verticalAlign: "top",
  },
  "& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root": {
    borderBottom: "none",
  },
  "& .MuiTableBody-root .MuiTableRow-root:hover .MuiTableCell-root": {
    backgroundColor: "#F8FAFC",
  },
};

const CMS_CATEGORIES = [
  { value: "ranks", label: "Ranks" },
  { value: "crates", label: "Crates" },
  { value: "packages", label: "Packages" },
];

const createCmsForm = (category = "ranks") => {
  const base = {
    id: "",
    code: "",
    name: "",
    description: "",
    price: "",
    currency: "INR",
    img: "",
    perksText: "",
    displayOrder: "0",
    isActive: true,
    rankKind: "lifetime",
    billingInterval: "none",
    status: "planned",
    info: "",
    crateIcon: "",
    inventoryImage: "",
    badge: "",
    categoryTag: "",
    packageIcon: "",
  };

  if (category === "ranks") {
    return {
      ...base,
      rankKind: "lifetime",
      billingInterval: "none",
    };
  }

  if (category === "crates") {
    return {
      ...base,
      status: "planned",
      info: "",
      crateIcon: "",
      inventoryImage: "",
    };
  }

  if (category === "packages") {
    return {
      ...base,
      badge: "",
      categoryTag: "",
      packageIcon: "",
    };
  }

  return base;
};

const createPromotionForm = () => ({
  id: "",
  title: "",
  description: "",
  kind: "upfront",
  code: "",
  productCodes: [],
  productCategories: [],
  discountType: "percent",
  discountValue: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  usageLimit: "",
  usagePerUser: "",
  stackable: false,
  showOnStorefront: false,
  startsAt: "",
  endsAt: "",
  displayOrder: "0",
  isActive: true,
});

const toDateTimeLocalInput = (value) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

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
  const [actionProducts, setActionProducts] = useState([]);
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
    productId: "",
    serverName: "",
    commandsText: "",
    isActive: true,
    isRevokeAction: false,
  });

  const [cmsCategory, setCmsCategory] = useState("ranks");
  const [cmsRows, setCmsRows] = useState([]);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsUploadingImage, setCmsUploadingImage] = useState(false);
  const [imageKitConfigured, setImageKitConfigured] = useState(false);
  const [cmsForm, setCmsForm] = useState(() => createCmsForm("ranks"));
  const [promotions, setPromotions] = useState([]);
  const [promotionForm, setPromotionForm] = useState(() =>
    createPromotionForm(),
  );
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotionScopeOpen, setPromotionScopeOpen] = useState(false);
  const [promotionAnalyticsOpen, setPromotionAnalyticsOpen] = useState(false);
  const [promotionAnalyticsPromotion, setPromotionAnalyticsPromotion] =
    useState(null);

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
    () =>
      actions.filter(
        (a) =>
          a.action_kind === "revoke" ||
          a.is_revoke_action ||
          a.product_code === REVOKE_ACTION_PRODUCT_CODE,
      ),
    [actions],
  );

  const cmsCategoryLabel =
    CMS_CATEGORIES.find((item) => item.value === cmsCategory)?.label ||
    "Catalog";
  const cmsCanUploadImage = ["ranks", "crates", "packages"].includes(
    cmsCategory,
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

  const promotionDiscountLabel = (promotion) => {
    if (!promotion) return "-";

    const value = Number(promotion.discountValue || 0);
    if (promotion.discountType === "fixed") {
      return `INR ${value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} off`;
    }

    return `${value}% off`;
  };

  const promotionWindowLabel = (promotion) => {
    const startsAt = promotion?.startsAt ? new Date(promotion.startsAt) : null;
    const endsAt = promotion?.endsAt ? new Date(promotion.endsAt) : null;

    if (!startsAt && !endsAt) return "Always";

    const formatDate = (date) => {
      if (!date || Number.isNaN(date.getTime())) return "-";
      return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    };

    return `${formatDate(startsAt)} to ${formatDate(endsAt)}`;
  };

  const categoryLabelByValue = useMemo(() => {
    return CMS_CATEGORIES.reduce((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {});
  }, []);

  const promotionScopeSummary = (promotion) => {
    const productCodes = Array.isArray(promotion?.productCodes)
      ? promotion.productCodes
      : [];
    const productCategories = Array.isArray(promotion?.productCategories)
      ? promotion.productCategories
      : [];

    if (!productCodes.length && !productCategories.length) {
      return "All products";
    }

    const categoryLabel = productCategories
      .map((value) => categoryLabelByValue[value] || value)
      .join(", ");

    if (productCodes.length && categoryLabel) {
      return `${categoryLabel} + ${productCodes.length} specific product${productCodes.length === 1 ? "" : "s"}`;
    }

    if (categoryLabel) {
      return categoryLabel;
    }

    return `${productCodes.length} product${productCodes.length === 1 ? "" : "s"}`;
  };

  const analyticsDateLabel = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const percentLabel = (value, digits = 1) => {
    if (!Number.isFinite(Number(value))) return "-";
    return `${Number(value).toFixed(digits)}%`;
  };

  const buildPromotionAnalyticsRows = (promotion) => {
    if (!promotion) return [];

    const totalUsed = Number(promotion.totalUsed || 0);
    const uniqueUsers = Number(promotion.uniqueUsersCount || 0);
    const repeatUses = Math.max(totalUsed - uniqueUsers, 0);
    const usageLimit =
      promotion.usageLimit === null || promotion.usageLimit === undefined
        ? null
        : Number(promotion.usageLimit);
    const totalRevenueGenerated = Number(promotion.totalRevenueGenerated || 0);
    const totalBaseRevenue = Number(promotion.totalBaseRevenue || 0);
    const totalDiscountGiven = Number(promotion.totalDiscountGiven || 0);
    const averageOrderValue = Number(promotion.averageOrderValue || 0);
    const avgDiscountPerUse =
      totalUsed > 0 ? totalDiscountGiven / totalUsed : 0;
    const effectiveDiscountRate =
      totalBaseRevenue > 0 ? (totalDiscountGiven / totalBaseRevenue) * 100 : 0;
    const usageUtilization =
      usageLimit && usageLimit > 0 ? (totalUsed / usageLimit) * 100 : null;
    const repeatUseRate = totalUsed > 0 ? (repeatUses / totalUsed) * 100 : 0;
    const productCodes = Array.isArray(promotion.productCodes)
      ? promotion.productCodes
      : [];
    const productCategories = Array.isArray(promotion.productCategories)
      ? promotion.productCategories
      : [];

    const rows = [
      {
        category: "Campaign",
        metric: "Promotion Type",
        value: promotion.kind === "coupon" ? "Coupon" : "Upfront Discount",
      },
      {
        category: "Campaign",
        metric: "Status",
        value: promotion.isActive ? "Active" : "Inactive",
      },
      {
        category: "Campaign",
        metric: "Campaign Window",
        value: promotionWindowLabel(promotion),
      },
      {
        category: "Campaign",
        metric: "Homepage Visibility",
        value: promotion.showOnStorefront ? "Visible" : "Hidden",
      },
      {
        category: "Scope",
        metric: "Scope Summary",
        value: promotionScopeSummary(promotion),
      },
      {
        category: "Scope",
        metric: "Category Targets",
        value: productCategories.length
          ? productCategories
              .map((entry) => categoryLabelByValue[entry] || entry)
              .join(", ")
          : "All categories",
      },
      {
        category: "Scope",
        metric: "Product Overrides",
        value: productCodes.length ? `${productCodes.length} selected` : "None",
      },
      {
        category: "Usage",
        metric: "Total Redemptions",
        value: totalUsed.toLocaleString("en-IN"),
      },
      {
        category: "Usage",
        metric: "Usage Limit",
        value:
          usageLimit && usageLimit > 0
            ? usageLimit.toLocaleString("en-IN")
            : "Unlimited",
      },
      {
        category: "Usage",
        metric: "Usage Utilization",
        value:
          usageUtilization === null
            ? "Unlimited"
            : percentLabel(usageUtilization),
      },
      {
        category: "Usage",
        metric: "Remaining Uses",
        value:
          usageLimit && usageLimit > 0
            ? Math.max(usageLimit - totalUsed, 0).toLocaleString("en-IN")
            : "Unlimited",
      },
      {
        category: "Audience",
        metric: "Unique Users",
        value: uniqueUsers.toLocaleString("en-IN"),
      },
      {
        category: "Audience",
        metric: "Repeat Redemptions",
        value: repeatUses.toLocaleString("en-IN"),
      },
      {
        category: "Audience",
        metric: "Repeat Use Rate",
        value: totalUsed > 0 ? percentLabel(repeatUseRate) : "-",
      },
      {
        category: "Revenue",
        metric: "Gross Revenue (Before Discount)",
        value: money(totalBaseRevenue),
      },
      {
        category: "Revenue",
        metric: "Net Revenue (After Discount)",
        value: money(totalRevenueGenerated),
      },
      {
        category: "Revenue",
        metric: "Total Discount Given",
        value: money(totalDiscountGiven),
      },
      {
        category: "Revenue",
        metric: "Average Order Value",
        value: money(averageOrderValue),
      },
      {
        category: "Revenue",
        metric: "Avg Discount Per Redemption",
        value: money(avgDiscountPerUse),
      },
      {
        category: "Revenue",
        metric: "Effective Discount Rate",
        value:
          totalBaseRevenue > 0 ? percentLabel(effectiveDiscountRate, 2) : "-",
      },
      {
        category: "Timeline",
        metric: "First Redemption",
        value: analyticsDateLabel(promotion.firstRedeemedAt),
      },
      {
        category: "Timeline",
        metric: "Last Redemption",
        value: analyticsDateLabel(promotion.lastRedeemedAt),
      },
    ];

    if (promotion.kind === "coupon") {
      rows.splice(
        4,
        0,
        {
          category: "Campaign",
          metric: "Coupon Code",
          value: promotion.code || "-",
        },
        {
          category: "Campaign",
          metric: "Usage Per User",
          value:
            promotion.usagePerUser && Number(promotion.usagePerUser) > 0
              ? String(promotion.usagePerUser)
              : "Unlimited",
        },
        {
          category: "Campaign",
          metric: "Stackable With Upfront",
          value: promotion.stackable ? "Yes" : "No",
        },
      );
    }

    return rows;
  };

  const refreshPostPurchaseLinkData = async () => {
    const [actionProductRes, actionRes] = await Promise.all([
      axios.get(`${apiBaseUrl}/api/admin/postpurchase-products`, {
        headers: authHeaders,
      }),
      axios.get(`${apiBaseUrl}/api/admin/postpurchase-actions`, {
        headers: authHeaders,
      }),
    ]);

    setActionProducts(actionProductRes.data?.products || []);
    setActions(actionRes.data || []);
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
        actionProductRes,
        actionRes,
        discountRes,
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
        axios.get(`${apiBaseUrl}/api/admin/postpurchase-products`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/postpurchase-actions`, {
          headers: authHeaders,
        }),
        axios.get(`${apiBaseUrl}/api/admin/discounts`, {
          headers: authHeaders,
        }),
      ]);

      setSummary(sumRes.data || {});
      setActiveSubs(activeRes.data || []);
      setExpiredSubs(expiredRes.data || []);
      setPermanentPurchases(permanentRes.data || []);
      setActivePermanentRanks(activePermanentRes.data || []);
      setProducts(productRes.data?.products || []);
      setActionProducts(actionProductRes.data?.products || []);
      setActions(actionRes.data || []);
      setPromotions(discountRes.data || []);

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

  const loadCmsCategory = async (
    category = cmsCategory,
    { preserveNotice = true } = {},
  ) => {
    setCmsLoading(true);

    try {
      const [{ data: rows }, { data: imageKitStatus }] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/admin/cms/${category}`, {
          headers: authHeaders,
          params: { includeInactive: true },
        }),
        axios.get(`${apiBaseUrl}/api/admin/cms/upload-image/status`, {
          headers: authHeaders,
        }),
      ]);

      setCmsRows(Array.isArray(rows) ? rows : []);
      setImageKitConfigured(Boolean(imageKitStatus?.configured));

      if (!preserveNotice) {
        setNotice({ message: "", severity: "info" });
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate("/admin");
        return;
      }

      setNoticeMessage(
        error?.response?.data?.error || "Failed to load CMS category",
        "error",
      );
    } finally {
      setCmsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadCmsCategory(cmsCategory, { preserveNotice: true });
  }, [token, cmsCategory]);

  const resetCmsForm = (category = cmsCategory) => {
    setCmsForm(createCmsForm(category));
  };

  const buildCmsPayload = () => {
    const payload = {
      code: cmsForm.code.trim(),
      name: cmsForm.name.trim(),
      description: cmsForm.description.trim(),
      price: Number(cmsForm.price),
      currency: cmsForm.currency.trim() || "INR",
      img: cmsForm.img.trim(),
      perks: cmsForm.perksText
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean),
      displayOrder: Number.parseInt(cmsForm.displayOrder || "0", 10) || 0,
      isActive: Boolean(cmsForm.isActive),
    };

    if (cmsCategory === "ranks") {
      payload.rankKind = cmsForm.rankKind;
      payload.billingInterval = cmsForm.billingInterval;
    }

    if (cmsCategory === "crates") {
      payload.status = cmsForm.status;
      payload.info = cmsForm.info.trim();
      payload.crateIcon = cmsForm.crateIcon.trim();
      payload.inventoryImage = cmsForm.inventoryImage.trim();
    }

    if (cmsCategory === "packages") {
      payload.badge = cmsForm.badge.trim();
      payload.categoryTag = cmsForm.categoryTag.trim();
      payload.packageIcon = cmsForm.packageIcon.trim();
    }

    return payload;
  };

  const saveCmsProduct = async () => {
    if (!cmsForm.code.trim() || !cmsForm.name.trim()) {
      setNoticeMessage("Code and name are required", "warning");
      return;
    }

    if (!Number.isFinite(Number(cmsForm.price)) || Number(cmsForm.price) < 0) {
      setNoticeMessage("Price must be a non-negative number", "warning");
      return;
    }

    const payload = buildCmsPayload();

    try {
      if (cmsForm.id) {
        await axios.put(
          `${apiBaseUrl}/api/admin/cms/${cmsCategory}/${cmsForm.id}`,
          payload,
          { headers: authHeaders },
        );
        setNoticeMessage(`${cmsCategoryLabel} updated`, "success");
      } else {
        await axios.post(
          `${apiBaseUrl}/api/admin/cms/${cmsCategory}`,
          payload,
          {
            headers: authHeaders,
          },
        );
        setNoticeMessage(`${cmsCategoryLabel} created`, "success");
      }

      resetCmsForm(cmsCategory);
      await loadCmsCategory(cmsCategory, { preserveNotice: true });
      await refreshPostPurchaseLinkData();
    } catch (error) {
      setNoticeMessage(
        error?.response?.data?.error || "Failed to save CMS product",
        "error",
      );
    }
  };

  const mapCmsRowToForm = (row) => ({
    id: row.id || "",
    code: row.code || "",
    name: row.name || "",
    description: row.description || "",
    price: row.price !== undefined ? String(row.price) : "",
    currency: row.currency || "INR",
    img: row.img || "",
    perksText: Array.isArray(row.perks) ? row.perks.join("\n") : "",
    displayOrder:
      row.displayOrder !== undefined ? String(row.displayOrder) : "0",
    isActive: row.isActive !== false,
    rankKind: row.rankKind || "lifetime",
    billingInterval: row.billingInterval || "none",
    status: row.status || "planned",
    info: row.info || "",
    crateIcon: row.crateIcon || "",
    inventoryImage: row.inventoryImage || "",
    badge: row.badge || "",
    categoryTag: row.categoryTag || "",
    packageIcon: row.packageIcon || "",
  });

  const editCmsProduct = (row) => {
    setCmsForm(mapCmsRowToForm(row));
    setTab("catalog");
  };

  const deleteCmsProduct = async (row) => {
    const ok = window.confirm(`Delete ${row.name}? This cannot be undone.`);
    if (!ok) return;

    try {
      await axios.delete(
        `${apiBaseUrl}/api/admin/cms/${cmsCategory}/${row.id}`,
        {
          headers: authHeaders,
        },
      );
      setNoticeMessage(`${cmsCategoryLabel} deleted`, "info");
      await loadCmsCategory(cmsCategory, { preserveNotice: true });
      await refreshPostPurchaseLinkData();
    } catch (error) {
      setNoticeMessage(
        error?.response?.data?.error || "Failed to delete CMS product",
        "error",
      );
    }
  };

  const resetPromotionForm = () => {
    setPromotionForm(createPromotionForm());
    setPromotionScopeOpen(false);
  };

  const mapPromotionRowToForm = (row) => ({
    id: row.id || "",
    title: row.title || "",
    description: row.description || "",
    kind: row.kind === "automatic" ? "upfront" : row.kind || "upfront",
    code: row.code || "",
    productCodes: Array.isArray(row.productCodes)
      ? row.productCodes
      : row.productCode
        ? [row.productCode]
        : [],
    productCategories: Array.isArray(row.productCategories)
      ? row.productCategories
      : [],
    discountType: row.discountType || "percent",
    discountValue:
      row.discountValue !== undefined && row.discountValue !== null
        ? String(row.discountValue)
        : "",
    minOrderAmount:
      row.minOrderAmount !== undefined && row.minOrderAmount !== null
        ? String(row.minOrderAmount)
        : "0",
    maxDiscountAmount:
      row.maxDiscountAmount !== undefined && row.maxDiscountAmount !== null
        ? String(row.maxDiscountAmount)
        : "",
    usageLimit:
      row.usageLimit !== undefined && row.usageLimit !== null
        ? String(row.usageLimit)
        : "",
    usagePerUser:
      row.usagePerUser !== undefined && row.usagePerUser !== null
        ? String(row.usagePerUser)
        : "",
    stackable: row.stackable === true,
    showOnStorefront: row.showOnStorefront === true,
    startsAt: toDateTimeLocalInput(row.startsAt),
    endsAt: toDateTimeLocalInput(row.endsAt),
    displayOrder:
      row.displayOrder !== undefined && row.displayOrder !== null
        ? String(row.displayOrder)
        : "0",
    isActive: row.isActive !== false,
  });

  const buildPromotionPayload = () => {
    const toNullableNumber = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const toNullableInteger = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return {
      title: promotionForm.title.trim(),
      description: promotionForm.description.trim(),
      kind: promotionForm.kind,
      code: promotionForm.code.trim().toUpperCase(),
      productCodes: promotionForm.productCodes,
      productCategories: promotionForm.productCategories,
      discountType: promotionForm.discountType,
      discountValue: Number(promotionForm.discountValue),
      minOrderAmount:
        promotionForm.kind === "coupon"
          ? Number(promotionForm.minOrderAmount || 0)
          : 0,
      maxDiscountAmount:
        promotionForm.kind === "coupon"
          ? toNullableNumber(promotionForm.maxDiscountAmount)
          : null,
      usageLimit: toNullableInteger(promotionForm.usageLimit),
      usagePerUser: toNullableInteger(promotionForm.usagePerUser),
      stackable: promotionForm.stackable,
      showOnStorefront: promotionForm.showOnStorefront,
      startsAt: promotionForm.startsAt
        ? new Date(promotionForm.startsAt).toISOString()
        : null,
      endsAt: promotionForm.endsAt
        ? new Date(promotionForm.endsAt).toISOString()
        : null,
      displayOrder: Number.parseInt(promotionForm.displayOrder || "0", 10) || 0,
      isActive: promotionForm.isActive,
    };
  };

  const actionProductsByCategory = useMemo(() => {
    const map = {
      ranks: [],
      crates: [],
      packages: [],
    };

    actionProducts.forEach((product) => {
      const category = String(product.category || "").toLowerCase();
      if (!map[category]) return;
      map[category].push(product);
    });

    return map;
  }, [actionProducts]);

  const clearPromotionScope = () => {
    setPromotionForm((prev) => ({
      ...prev,
      productCodes: [],
      productCategories: [],
    }));
  };

  const togglePromotionCategoryScope = (category) => {
    setPromotionForm((prev) => {
      const selected = new Set(prev.productCategories || []);
      if (selected.has(category)) {
        selected.delete(category);
      } else {
        selected.add(category);
      }

      return {
        ...prev,
        productCategories: [...selected],
      };
    });
  };

  const togglePromotionProductScope = (productCode) => {
    setPromotionForm((prev) => {
      const selected = new Set(prev.productCodes || []);
      if (selected.has(productCode)) {
        selected.delete(productCode);
      } else {
        selected.add(productCode);
      }

      return {
        ...prev,
        productCodes: [...selected],
      };
    });
  };

  const editPromotion = (row) => {
    setPromotionForm(mapPromotionRowToForm(row));
    setTab("discounts");
  };

  const openPromotionAnalytics = (promotion) => {
    setPromotionAnalyticsPromotion(promotion);
    setPromotionAnalyticsOpen(true);
  };

  const closePromotionAnalytics = () => {
    setPromotionAnalyticsOpen(false);
    setPromotionAnalyticsPromotion(null);
  };

  const savePromotion = async () => {
    if (!promotionForm.title.trim()) {
      setNoticeMessage("Promotion title is required", "warning");
      return;
    }

    if (!Number.isFinite(Number(promotionForm.discountValue))) {
      setNoticeMessage("Discount value must be a valid number", "warning");
      return;
    }

    if (promotionForm.kind === "coupon" && !promotionForm.code.trim()) {
      setNoticeMessage(
        "Coupon code is required for coupon promotions",
        "warning",
      );
      return;
    }

    setPromotionSaving(true);
    try {
      const payload = buildPromotionPayload();

      if (promotionForm.id) {
        await axios.put(
          `${apiBaseUrl}/api/admin/discounts/${promotionForm.id}`,
          payload,
          { headers: authHeaders },
        );
        setNoticeMessage("Promotion updated", "success");
      } else {
        await axios.post(`${apiBaseUrl}/api/admin/discounts`, payload, {
          headers: authHeaders,
        });
        setNoticeMessage("Promotion created", "success");
      }

      resetPromotionForm();
      await loadDashboard({ preserveNotice: true });
    } catch (error) {
      setNoticeMessage(
        error?.response?.data?.error || "Failed to save promotion",
        "error",
      );
    } finally {
      setPromotionSaving(false);
    }
  };

  const deletePromotion = async (row) => {
    const ok = window.confirm(`Delete promotion \"${row.title}\"?`);
    if (!ok) return;

    try {
      await axios.delete(`${apiBaseUrl}/api/admin/discounts/${row.id}`, {
        headers: authHeaders,
      });

      setNoticeMessage("Promotion deleted", "info");
      await loadDashboard({ preserveNotice: true });
    } catch (error) {
      setNoticeMessage(
        error?.response?.data?.error || "Failed to delete promotion",
        "error",
      );
    }
  };

  const uploadCmsImageToField =
    (targetField, uploadCategory = cmsCategory) =>
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!["ranks", "crates", "packages"].includes(uploadCategory)) {
        setNoticeMessage(
          "Image upload is currently enabled only for ranks, crates, and packages",
          "warning",
        );
        return;
      }

      if (!imageKitConfigured) {
        setNoticeMessage("ImageKit is not configured on the server", "warning");
        return;
      }

      try {
        setCmsUploadingImage(true);
        const fileData = await readFileAsDataUrl(file);

        const { data } = await axios.post(
          `${apiBaseUrl}/api/admin/cms/upload-image`,
          {
            fileName: file.name,
            fileData,
            category: uploadCategory,
          },
          { headers: authHeaders },
        );

        setCmsForm((prev) => ({
          ...prev,
          [targetField]: data?.url || prev[targetField],
        }));

        setNoticeMessage("Image uploaded successfully", "success");
      } catch (error) {
        setNoticeMessage(
          error?.response?.data?.error || "Image upload failed",
          "error",
        );
      } finally {
        setCmsUploadingImage(false);
      }
    };

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
            ? String(revokeForm.revokeActionId)
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
        productId: actionForm.isRevokeAction ? "" : actionForm.productId,
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
        productId: "",
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
      productId: row.product_id || "",
      serverName: row.server_name,
      commandsText: row.commands_text,
      isActive: !!row.is_active,
      isRevokeAction:
        row.action_kind === "revoke" ||
        row.is_revoke_action ||
        row.product_code === REVOKE_ACTION_PRODUCT_CODE,
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
              <Tab value="catalog" label="Catalog CMS" />
              <Tab value="discounts" label="Discounts & Coupons" />
              <Tab value="actions" label="Postpurchase Actions" />
              <Tab value="tools" label="Tools" />
            </Tabs>
            <Button
              variant="outlined"
              onClick={() => {
                if (tab === "catalog") {
                  loadCmsCategory(cmsCategory, { preserveNotice: false });
                } else {
                  loadDashboard();
                }
              }}
              disabled={busy || cmsLoading || cmsUploadingImage}
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

        {tab === "catalog" && (
          <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
            <Grid size={{ xs: 12, xl: 5 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">
                      {cmsForm.id ? "Edit" : "Create"} {cmsCategoryLabel}
                    </Typography>

                    <FormControl fullWidth size="small">
                      <InputLabel id="cms-category-label">Category</InputLabel>
                      <Select
                        labelId="cms-category-label"
                        label="Category"
                        value={cmsCategory}
                        onChange={(e) => {
                          const nextCategory = e.target.value;
                          setCmsCategory(nextCategory);
                          resetCmsForm(nextCategory);
                        }}
                      >
                        {CMS_CATEGORIES.map((item) => (
                          <MenuItem key={item.value} value={item.value}>
                            {item.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      size="small"
                      label="Code"
                      value={cmsForm.code}
                      onChange={(e) =>
                        setCmsForm((prev) => ({
                          ...prev,
                          code: e.target.value,
                        }))
                      }
                    />

                    <TextField
                      size="small"
                      label="Name"
                      value={cmsForm.name}
                      onChange={(e) =>
                        setCmsForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          size="small"
                          label="Price"
                          type="number"
                          value={cmsForm.price}
                          onChange={(e) =>
                            setCmsForm((prev) => ({
                              ...prev,
                              price: e.target.value,
                            }))
                          }
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          size="small"
                          label="Currency"
                          value={cmsForm.currency}
                          onChange={(e) =>
                            setCmsForm((prev) => ({
                              ...prev,
                              currency: e.target.value,
                            }))
                          }
                          fullWidth
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          size="small"
                          label="Display Order"
                          type="number"
                          value={cmsForm.displayOrder}
                          onChange={(e) =>
                            setCmsForm((prev) => ({
                              ...prev,
                              displayOrder: e.target.value,
                            }))
                          }
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={cmsForm.isActive}
                              onChange={(e) =>
                                setCmsForm((prev) => ({
                                  ...prev,
                                  isActive: e.target.checked,
                                }))
                              }
                            />
                          }
                          label="Active"
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      size="small"
                      label="Image URL"
                      value={cmsForm.img}
                      onChange={(e) =>
                        setCmsForm((prev) => ({ ...prev, img: e.target.value }))
                      }
                    />

                    {cmsCanUploadImage ? (
                      <Stack spacing={1.25}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1.5}
                          sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                        >
                          <Button
                            component="label"
                            variant="outlined"
                            startIcon={<Upload size={16} />}
                            disabled={!imageKitConfigured || cmsUploadingImage}
                          >
                            {cmsUploadingImage
                              ? "Uploading..."
                              : "Upload Primary Image"}
                            <input
                              hidden
                              type="file"
                              accept="image/*"
                              onChange={uploadCmsImageToField("img")}
                            />
                          </Button>

                          <Chip
                            size="small"
                            label={
                              imageKitConfigured
                                ? "ImageKit Connected"
                                : "ImageKit Not Configured"
                            }
                            color={imageKitConfigured ? "success" : "warning"}
                            variant="outlined"
                          />
                        </Stack>

                        {!imageKitConfigured ? (
                          <Typography variant="caption" color="text.secondary">
                            Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and
                            IMAGEKIT_URL_ENDPOINT in backend environment.
                          </Typography>
                        ) : null}
                      </Stack>
                    ) : null}

                    <TextField
                      label="Description"
                      multiline
                      minRows={2}
                      value={cmsForm.description}
                      onChange={(e) =>
                        setCmsForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />

                    <TextField
                      label="Perks (one per line)"
                      multiline
                      minRows={4}
                      value={cmsForm.perksText}
                      onChange={(e) =>
                        setCmsForm((prev) => ({
                          ...prev,
                          perksText: e.target.value,
                        }))
                      }
                    />

                    {cmsCategory === "ranks" ? (
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel id="rank-kind-label">
                              Rank Type
                            </InputLabel>
                            <Select
                              labelId="rank-kind-label"
                              label="Rank Type"
                              value={cmsForm.rankKind}
                              onChange={(e) =>
                                setCmsForm((prev) => ({
                                  ...prev,
                                  rankKind: e.target.value,
                                }))
                              }
                            >
                              <MenuItem value="lifetime">Lifetime</MenuItem>
                              <MenuItem value="subscription">
                                Subscription
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel id="billing-interval-label">
                              Billing Interval
                            </InputLabel>
                            <Select
                              labelId="billing-interval-label"
                              label="Billing Interval"
                              value={cmsForm.billingInterval}
                              onChange={(e) =>
                                setCmsForm((prev) => ({
                                  ...prev,
                                  billingInterval: e.target.value,
                                }))
                              }
                            >
                              <MenuItem value="none">None</MenuItem>
                              <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    ) : null}

                    {cmsCategory === "crates" ? (
                      <Stack spacing={1.5}>
                        <Grid container spacing={1.5}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel id="crate-status-label">
                                Status
                              </InputLabel>
                              <Select
                                labelId="crate-status-label"
                                label="Status"
                                value={cmsForm.status}
                                onChange={(e) =>
                                  setCmsForm((prev) => ({
                                    ...prev,
                                    status: e.target.value,
                                  }))
                                }
                              >
                                <MenuItem value="live">Live</MenuItem>
                                <MenuItem value="soon">Soon</MenuItem>
                                <MenuItem value="planned">Planned</MenuItem>
                                <MenuItem value="archived">Archived</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              label="Info"
                              value={cmsForm.info}
                              onChange={(e) =>
                                setCmsForm((prev) => ({
                                  ...prev,
                                  info: e.target.value,
                                }))
                              }
                              fullWidth
                            />
                          </Grid>
                        </Grid>

                        <TextField
                          size="small"
                          label="Crate Icon URL"
                          value={cmsForm.crateIcon}
                          onChange={(e) =>
                            setCmsForm((prev) => ({
                              ...prev,
                              crateIcon: e.target.value,
                            }))
                          }
                        />

                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<Upload size={16} />}
                          disabled={!imageKitConfigured || cmsUploadingImage}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {cmsUploadingImage
                            ? "Uploading..."
                            : "Upload Crate Icon"}
                          <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={uploadCmsImageToField(
                              "crateIcon",
                              "crates",
                            )}
                          />
                        </Button>

                        <TextField
                          size="small"
                          label="Inventory Image URL"
                          value={cmsForm.inventoryImage}
                          onChange={(e) =>
                            setCmsForm((prev) => ({
                              ...prev,
                              inventoryImage: e.target.value,
                            }))
                          }
                        />

                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<Upload size={16} />}
                          disabled={!imageKitConfigured || cmsUploadingImage}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {cmsUploadingImage
                            ? "Uploading..."
                            : "Upload Inventory Image"}
                          <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={uploadCmsImageToField(
                              "inventoryImage",
                              "crates",
                            )}
                          />
                        </Button>
                      </Stack>
                    ) : null}

                    {cmsCategory === "packages" ? (
                      <Stack spacing={1.5}>
                        <Grid container spacing={1.5}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              label="Badge"
                              value={cmsForm.badge}
                              onChange={(e) =>
                                setCmsForm((prev) => ({
                                  ...prev,
                                  badge: e.target.value,
                                }))
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              label="Category Tag"
                              value={cmsForm.categoryTag}
                              onChange={(e) =>
                                setCmsForm((prev) => ({
                                  ...prev,
                                  categoryTag: e.target.value,
                                }))
                              }
                              fullWidth
                            />
                          </Grid>
                        </Grid>

                        <TextField
                          size="small"
                          label="Package Icon URL"
                          value={cmsForm.packageIcon}
                          onChange={(e) =>
                            setCmsForm((prev) => ({
                              ...prev,
                              packageIcon: e.target.value,
                            }))
                          }
                        />

                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<Upload size={16} />}
                          disabled={!imageKitConfigured || cmsUploadingImage}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {cmsUploadingImage
                            ? "Uploading..."
                            : "Upload Package Icon"}
                          <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={uploadCmsImageToField(
                              "packageIcon",
                              "packages",
                            )}
                          />
                        </Button>
                      </Stack>
                    ) : null}

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                    >
                      <Button
                        variant="contained"
                        onClick={saveCmsProduct}
                        disabled={cmsLoading || cmsUploadingImage}
                      >
                        {cmsForm.id ? "Update" : "Create"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => resetCmsForm(cmsCategory)}
                      >
                        Reset Form
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, xl: 7 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                    >
                      <Typography variant="h6">
                        {cmsCategoryLabel} Catalog
                      </Typography>
                      <Chip
                        label={`${cmsRows.length} item${cmsRows.length === 1 ? "" : "s"}`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <TableContainer sx={tableContainerSx}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Code</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Order</TableCell>
                            <TableCell>Active</TableCell>
                            <TableCell>Image</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {cmsRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.code}</TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>
                                {row.currency || "INR"}{" "}
                                {Number(row.price || 0).toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </TableCell>
                              <TableCell>{row.displayOrder ?? 0}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.isActive ? "Active" : "Inactive"}
                                  color={row.isActive ? "success" : "default"}
                                  variant={row.isActive ? "filled" : "outlined"}
                                />
                              </TableCell>
                              <TableCell>
                                {row.img ||
                                (cmsCategory === "crates" &&
                                  (row.crateIcon || row.inventoryImage)) ||
                                (cmsCategory === "packages" &&
                                  row.packageIcon) ? (
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {row.img ? (
                                      <Box
                                        component="img"
                                        src={row.img}
                                        alt={row.name}
                                        sx={{
                                          width: 46,
                                          height: 46,
                                          objectFit: "cover",
                                          border: "1px solid",
                                          borderColor: "divider",
                                          borderRadius: 0.75,
                                        }}
                                      />
                                    ) : null}

                                    {cmsCategory === "crates" &&
                                    row.crateIcon ? (
                                      <Box
                                        component="img"
                                        src={row.crateIcon}
                                        alt={`${row.name} icon`}
                                        sx={{
                                          width: 46,
                                          height: 46,
                                          objectFit: "cover",
                                          border: "1px solid",
                                          borderColor: "divider",
                                          borderRadius: 0.75,
                                        }}
                                      />
                                    ) : null}

                                    {cmsCategory === "crates" &&
                                    row.inventoryImage ? (
                                      <Box
                                        component="img"
                                        src={row.inventoryImage}
                                        alt={`${row.name} inventory`}
                                        sx={{
                                          width: 46,
                                          height: 46,
                                          objectFit: "cover",
                                          border: "1px solid",
                                          borderColor: "divider",
                                          borderRadius: 0.75,
                                        }}
                                      />
                                    ) : null}

                                    {cmsCategory === "packages" &&
                                    row.packageIcon ? (
                                      <Box
                                        component="img"
                                        src={row.packageIcon}
                                        alt={`${row.name} icon`}
                                        sx={{
                                          width: 46,
                                          height: 46,
                                          objectFit: "cover",
                                          border: "1px solid",
                                          borderColor: "divider",
                                          borderRadius: 0.75,
                                        }}
                                      />
                                    ) : null}
                                  </Stack>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    No image
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => editCmsProduct(row)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => deleteCmsProduct(row)}
                                  >
                                    Delete
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}

                          {cmsRows.length === 0
                            ? renderEmptyRow(
                                7,
                                cmsLoading
                                  ? "Loading catalog data..."
                                  : "No products found for this category",
                              )
                            : null}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {tab === "discounts" && (
          <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
            <Grid size={{ xs: 12, xl: 5 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">
                      {promotionForm.id ? "Edit" : "Create"} Discount / Coupon
                    </Typography>

                    <FormControl fullWidth size="small">
                      <InputLabel id="promotion-kind-label">Type</InputLabel>
                      <Select
                        labelId="promotion-kind-label"
                        label="Type"
                        value={promotionForm.kind}
                        onChange={(e) =>
                          setPromotionForm((prev) => ({
                            ...prev,
                            kind: e.target.value,
                            code: e.target.value === "coupon" ? prev.code : "",
                            stackable:
                              e.target.value === "coupon"
                                ? prev.stackable
                                : false,
                            usageLimit:
                              e.target.value === "coupon"
                                ? prev.usageLimit
                                : "",
                            usagePerUser:
                              e.target.value === "coupon"
                                ? prev.usagePerUser
                                : "",
                            minOrderAmount:
                              e.target.value === "coupon"
                                ? prev.minOrderAmount
                                : "",
                            maxDiscountAmount:
                              e.target.value === "coupon"
                                ? prev.maxDiscountAmount
                                : "",
                          }))
                        }
                      >
                        <MenuItem value="upfront">Upfront Discount</MenuItem>
                        <MenuItem value="coupon">Coupon Code</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      size="small"
                      label="Title"
                      value={promotionForm.title}
                      onChange={(e) =>
                        setPromotionForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                    />

                    {promotionForm.kind === "coupon" ? (
                      <TextField
                        size="small"
                        label="Coupon Code"
                        value={promotionForm.code}
                        onChange={(e) =>
                          setPromotionForm((prev) => ({
                            ...prev,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    ) : null}

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        sx={{
                          justifyContent: "space-between",
                          alignItems: { xs: "flex-start", sm: "center" },
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>
                            Product Scope
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {promotionScopeSummary(promotionForm)}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          onClick={() => setPromotionScopeOpen(true)}
                        >
                          Choose Scope
                        </Button>
                      </Stack>
                    </Paper>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="promotion-discount-type-label">
                            Discount Type
                          </InputLabel>
                          <Select
                            labelId="promotion-discount-type-label"
                            label="Discount Type"
                            value={promotionForm.discountType}
                            onChange={(e) =>
                              setPromotionForm((prev) => ({
                                ...prev,
                                discountType: e.target.value,
                              }))
                            }
                          >
                            <MenuItem value="percent">Percent</MenuItem>
                            <MenuItem value="fixed">Fixed Amount</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          size="small"
                          label="Discount Value"
                          type="number"
                          value={promotionForm.discountValue}
                          onChange={(e) =>
                            setPromotionForm((prev) => ({
                              ...prev,
                              discountValue: e.target.value,
                            }))
                          }
                          fullWidth
                        />
                      </Grid>
                    </Grid>

                    {promotionForm.kind === "coupon" ? (
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            size="small"
                            label="Min Order Amount"
                            type="number"
                            value={promotionForm.minOrderAmount}
                            onChange={(e) =>
                              setPromotionForm((prev) => ({
                                ...prev,
                                minOrderAmount: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            size="small"
                            label="Max Discount Amount"
                            type="number"
                            value={promotionForm.maxDiscountAmount}
                            onChange={(e) =>
                              setPromotionForm((prev) => ({
                                ...prev,
                                maxDiscountAmount: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                    ) : null}

                    {promotionForm.kind === "coupon" ? (
                      <>
                        <Grid container spacing={1.5}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              label="Usage Limit"
                              type="number"
                              value={promotionForm.usageLimit}
                              onChange={(e) =>
                                setPromotionForm((prev) => ({
                                  ...prev,
                                  usageLimit: e.target.value,
                                }))
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              label="Usage Per User"
                              type="number"
                              value={promotionForm.usagePerUser}
                              onChange={(e) =>
                                setPromotionForm((prev) => ({
                                  ...prev,
                                  usagePerUser: e.target.value,
                                }))
                              }
                              fullWidth
                            />
                          </Grid>
                        </Grid>

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={promotionForm.stackable}
                              onChange={(e) =>
                                setPromotionForm((prev) => ({
                                  ...prev,
                                  stackable: e.target.checked,
                                }))
                              }
                            />
                          }
                          label="Allow stacking with upfront discounts"
                        />
                      </>
                    ) : null}

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={promotionForm.showOnStorefront}
                          onChange={(e) =>
                            setPromotionForm((prev) => ({
                              ...prev,
                              showOnStorefront: e.target.checked,
                            }))
                          }
                        />
                      }
                      label={
                        promotionForm.kind === "coupon"
                          ? "Show coupon in homepage discounts section"
                          : "Show in homepage discounts section"
                      }
                    />

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            Starts At
                          </Typography>
                          <TextField
                            size="small"
                            type="datetime-local"
                            value={promotionForm.startsAt}
                            onChange={(e) =>
                              setPromotionForm((prev) => ({
                                ...prev,
                                startsAt: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            Ends At
                          </Typography>
                          <TextField
                            size="small"
                            type="datetime-local"
                            value={promotionForm.endsAt}
                            onChange={(e) =>
                              setPromotionForm((prev) => ({
                                ...prev,
                                endsAt: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                        </Stack>
                      </Grid>
                    </Grid>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          size="small"
                          label="Display Order"
                          type="number"
                          value={promotionForm.displayOrder}
                          onChange={(e) =>
                            setPromotionForm((prev) => ({
                              ...prev,
                              displayOrder: e.target.value,
                            }))
                          }
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={promotionForm.isActive}
                              onChange={(e) =>
                                setPromotionForm((prev) => ({
                                  ...prev,
                                  isActive: e.target.checked,
                                }))
                              }
                            />
                          }
                          label="Active"
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      label="Description"
                      multiline
                      minRows={3}
                      value={promotionForm.description}
                      onChange={(e) =>
                        setPromotionForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                    >
                      <Button
                        variant="contained"
                        onClick={savePromotion}
                        disabled={busy || promotionSaving}
                      >
                        {promotionForm.id ? "Update" : "Create"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={resetPromotionForm}
                        disabled={busy || promotionSaving}
                      >
                        Reset Form
                      </Button>
                    </Stack>

                    <Dialog
                      open={promotionScopeOpen}
                      onClose={() => setPromotionScopeOpen(false)}
                      fullWidth
                      maxWidth="md"
                    >
                      <DialogTitle>Choose Promotion Scope</DialogTitle>
                      <DialogContent dividers>
                        <Stack spacing={2}>
                          <Alert severity="info">
                            Select one or more categories, specific products, or
                            leave everything unchecked to apply this promotion
                            to all products.
                          </Alert>

                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={
                                  !promotionForm.productCodes.length &&
                                  !promotionForm.productCategories.length
                                }
                                onChange={() => clearPromotionScope()}
                              />
                            }
                            label="All products"
                          />

                          <Grid container spacing={1.25}>
                            {CMS_CATEGORIES.map((category) => (
                              <Grid
                                key={category.value}
                                size={{ xs: 12, sm: 4 }}
                              >
                                <Paper variant="outlined" sx={{ p: 1 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={promotionForm.productCategories.includes(
                                          category.value,
                                        )}
                                        onChange={() =>
                                          togglePromotionCategoryScope(
                                            category.value,
                                          )
                                        }
                                      />
                                    }
                                    label={`${category.label} (${(actionProductsByCategory[category.value] || []).length})`}
                                  />
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>

                          {CMS_CATEGORIES.map((category) => (
                            <Paper
                              key={`scope-${category.value}`}
                              variant="outlined"
                              sx={{ p: 1.25 }}
                            >
                              <Stack spacing={1}>
                                <Typography sx={{ fontWeight: 600 }}>
                                  {category.label} Products
                                </Typography>

                                {(
                                  actionProductsByCategory[category.value] || []
                                ).length ? (
                                  <Grid container spacing={1}>
                                    {(
                                      actionProductsByCategory[
                                        category.value
                                      ] || []
                                    ).map((product) => (
                                      <Grid
                                        key={product.id}
                                        size={{ xs: 12, md: 6 }}
                                      >
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              checked={promotionForm.productCodes.includes(
                                                product.code,
                                              )}
                                              onChange={() =>
                                                togglePromotionProductScope(
                                                  product.code,
                                                )
                                              }
                                            />
                                          }
                                          label={
                                            product.displayName ||
                                            `${product.name} (${product.code})`
                                          }
                                        />
                                      </Grid>
                                    ))}
                                  </Grid>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    No products in this category yet.
                                  </Typography>
                                )}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </DialogContent>
                      <DialogActions>
                        <Button onClick={clearPromotionScope}>
                          Select All Products
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => setPromotionScopeOpen(false)}
                        >
                          Done
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, xl: 7 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                    >
                      <Typography variant="h6">
                        Configured Promotions
                      </Typography>
                      <Chip
                        label={`${promotions.length} item${promotions.length === 1 ? "" : "s"}`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <TableContainer sx={promotionsTableSx}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 220 }}>Title</TableCell>
                            <TableCell sx={{ width: 150 }}>Type</TableCell>
                            <TableCell sx={{ width: 170 }}>Scope</TableCell>
                            <TableCell sx={{ width: 180 }}>Discount</TableCell>
                            <TableCell sx={{ width: 220 }}>Window</TableCell>
                            <TableCell sx={{ width: 120 }}>Usage</TableCell>
                            <TableCell sx={{ width: 150 }}>Status</TableCell>
                            <TableCell sx={{ width: 220 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {promotions.map((promotion) => (
                            <TableRow key={promotion.id}>
                              <TableCell>
                                <Stack spacing={0.6}>
                                  <Typography
                                    sx={{ fontWeight: 700, lineHeight: 1.3 }}
                                  >
                                    {promotion.title}
                                  </Typography>
                                  {promotion.description ? (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {promotion.description}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.7}>
                                  <Chip
                                    size="small"
                                    label={
                                      promotion.kind === "coupon"
                                        ? "Coupon"
                                        : "Upfront"
                                    }
                                    color={
                                      promotion.kind === "coupon"
                                        ? "secondary"
                                        : "info"
                                    }
                                    variant="outlined"
                                  />
                                  {promotion.kind === "coupon" ? (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      label={`Code ${promotion.code || "-"}`}
                                      sx={{
                                        width: "fit-content",
                                        fontFamily: "monospace",
                                      }}
                                    ></Chip>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600, lineHeight: 1.35 }}
                                  >
                                    {promotionScopeSummary(promotion)}
                                  </Typography>
                                  {Array.isArray(promotion.productCodes) &&
                                  promotion.productCodes.length > 0 ? (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ lineHeight: 1.35 }}
                                    >
                                      {promotion.productCodes
                                        .slice(0, 2)
                                        .join(", ")}
                                      {promotion.productCodes.length > 2
                                        ? ` +${promotion.productCodes.length - 2}`
                                        : ""}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {promotionDiscountLabel(promotion)}
                                  </Typography>
                                  {promotion.kind === "coupon" &&
                                  Number(promotion.minOrderAmount || 0) > 0 ? (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ lineHeight: 1.35 }}
                                    >
                                      Min order:{" "}
                                      {money(promotion.minOrderAmount)}
                                    </Typography>
                                  ) : null}
                                  {promotion.kind === "coupon" &&
                                  promotion.maxDiscountAmount !== null &&
                                  promotion.maxDiscountAmount !== undefined ? (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ lineHeight: 1.35 }}
                                    >
                                      Max: {money(promotion.maxDiscountAmount)}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.45}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Starts
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ lineHeight: 1.35 }}
                                  >
                                    {promotion.startsAt
                                      ? analyticsDateLabel(promotion.startsAt)
                                      : "Now"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Ends
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ lineHeight: 1.35 }}
                                  >
                                    {promotion.endsAt
                                      ? analyticsDateLabel(promotion.endsAt)
                                      : "No expiry"}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Chip
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    label={`${Number(promotion.totalUsed || 0)} / ${promotion.usageLimit || "Unlimited"}`}
                                    sx={{
                                      width: "fit-content",
                                      fontWeight: 700,
                                    }}
                                  />
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.75}>
                                  <Chip
                                    size="small"
                                    label={
                                      promotion.isActive ? "Active" : "Inactive"
                                    }
                                    color={
                                      promotion.isActive ? "success" : "default"
                                    }
                                    variant={
                                      promotion.isActive ? "filled" : "outlined"
                                    }
                                  />
                                  {promotion.showOnStorefront ? (
                                    <Chip
                                      size="small"
                                      label="Visible On Homepage"
                                      color="info"
                                      variant="outlined"
                                    />
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{
                                    flexWrap: "wrap",
                                    "& .MuiButton-root": {
                                      minWidth: 84,
                                    },
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="info"
                                    onClick={() =>
                                      openPromotionAnalytics(promotion)
                                    }
                                  >
                                    Analytics
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => editPromotion(promotion)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => deletePromotion(promotion)}
                                  >
                                    Delete
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}

                          {promotions.length === 0
                            ? renderEmptyRow(
                                8,
                                busy
                                  ? "Loading promotions..."
                                  : "No discounts or coupons configured",
                              )
                            : null}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Dialog
              open={promotionAnalyticsOpen}
              onClose={closePromotionAnalytics}
              fullWidth
              maxWidth="lg"
            >
              <DialogTitle>
                Promotion Analytics
                {promotionAnalyticsPromotion
                  ? `: ${promotionAnalyticsPromotion.title}`
                  : ""}
              </DialogTitle>
              <DialogContent dividers>
                {promotionAnalyticsPromotion ? (
                  <Stack spacing={2}>
                    <Alert severity="info">
                      Comprehensive analytics view for this promotion, including
                      usage, audience behavior, revenue impact, and timeline
                      signals.
                    </Alert>

                    <TableContainer
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        maxHeight: 520,
                      }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell>Metric</TableCell>
                            <TableCell>Value</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {buildPromotionAnalyticsRows(
                            promotionAnalyticsPromotion,
                          ).map((row) => (
                            <TableRow key={`${row.category}-${row.metric}`}>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.category}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{row.metric}</TableCell>
                              <TableCell>{row.value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                ) : null}
              </DialogContent>
              <DialogActions>
                <Button variant="contained" onClick={closePromotionAnalytics}>
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </Grid>
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
                              productId: e.target.checked ? "" : "",
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
                          actionForm.isRevokeAction ? "" : actionForm.productId
                        }
                        label="Product"
                        onChange={(e) =>
                          setActionForm((prev) => ({
                            ...prev,
                            productId: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">
                          <em>Select product</em>
                        </MenuItem>
                        {actionProducts.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.code}
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
                            actionProducts.length === 0) ||
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
                            productId: "",
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
                          <TableCell>Product Code</TableCell>
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
                            <TableCell>{row.product_code || "-"}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={
                                  row.action_kind === "revoke" ||
                                  row.is_revoke_action ||
                                  row.product_code ===
                                    REVOKE_ACTION_PRODUCT_CODE
                                    ? "Revoke"
                                    : "Grant"
                                }
                                color={
                                  row.action_kind === "revoke" ||
                                  row.is_revoke_action ||
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
