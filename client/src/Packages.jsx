import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { fetchStorefrontCatalog } from "./data/cmsCatalogApi";
import {
  fetchActiveStoreDiscounts,
  formatMoney,
  getBestDiscountForProduct,
  getDiscountLabel,
  getOfferAnchorId,
} from "./data/storeDiscountApi";

const Packages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [packages, setPackages] = useState([]);
  const [currency, setCurrency] = useState("INR");
  const [discounts, setDiscounts] = useState([]);

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
  const highlightCode = new URLSearchParams(location.search).get("highlight");

  useEffect(() => {
    let disposed = false;

    const loadPackages = async () => {
      setLoading(true);
      setError("");

      try {
        const catalog = await fetchStorefrontCatalog();
        if (disposed) return;

        setPackages(catalog.packages || []);
        setCurrency(catalog.currency || "INR");
      } catch (catalogError) {
        if (disposed) return;
        setError(
          catalogError?.response?.data?.error ||
            "Failed to load package catalog",
        );
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    loadPackages();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const loadDiscounts = async () => {
      try {
        const activeDiscounts = await fetchActiveStoreDiscounts(apiBaseUrl);
        if (disposed) return;
        setDiscounts(activeDiscounts);
      } catch (fetchError) {
        if (disposed) return;
        setDiscountError(
          fetchError?.response?.data?.error ||
            "Discount offers could not be loaded",
        );
      }
    };

    loadDiscounts();

    return () => {
      disposed = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!highlightCode || loading) return;
    const target = document.getElementById(getOfferAnchorId(highlightCode));
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCode, loading]);

  const handleBuy = (pkg) => {
    navigate(`/buy?productCode=${encodeURIComponent(pkg.code || pkg.name)}`);
  };

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h3">Packages</Typography>
            <Typography color="text.secondary">
              Browse curated bundles that combine perks and utility upgrades.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {discountError ? <Alert severity="warning">{discountError}</Alert> : null}

      <Grid container spacing={2}>
        {packages.map((pkg) => {
          const discountInfo = getBestDiscountForProduct(
            pkg.code,
            pkg.price,
            discounts,
            pkg.category || "packages",
          );
          const isHighlighted =
            Boolean(highlightCode) && pkg.code === highlightCode;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={pkg.code || pkg.id || pkg.name}>
              <Card sx={{ height: "100%" }}>
                <CardContent
                  id={getOfferAnchorId(pkg.code)}
                  sx={{
                    p: 3,
                    border: isHighlighted ? "2px solid" : "none",
                    borderColor: isHighlighted ? "success.main" : "transparent",
                  }}
                >
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", flexWrap: "wrap" }}
                    >
                      {pkg.badge ? (
                        <Chip
                          label={pkg.badge}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      ) : null}
                      {pkg.categoryTag ? (
                        <Chip
                          label={pkg.categoryTag}
                          size="small"
                          color="accent"
                          variant="outlined"
                        />
                      ) : null}
                      {discountInfo ? (
                        <Chip
                          label={getDiscountLabel(discountInfo)}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : null}
                      {isHighlighted ? (
                        <Chip
                          label="Highlighted Offer"
                          size="small"
                          color="accent"
                        />
                      ) : null}
                    </Stack>

                    <Typography variant="h5">{pkg.name}</Typography>

                    {pkg.packageIcon ? (
                      <Box
                        component="img"
                        src={pkg.packageIcon}
                        alt={`${pkg.name} icon`}
                        sx={{
                          width: 72,
                          height: 72,
                          objectFit: "cover",
                          border: "2px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.default",
                        }}
                      />
                    ) : null}

                    {discountInfo ? (
                      <Stack spacing={0.5}>
                        <Typography
                          color="text.secondary"
                          sx={{ textDecoration: "line-through" }}
                        >
                          {formatMoney(pkg.price, currency)}
                        </Typography>
                        <Typography
                          sx={{ fontWeight: 700, color: "error.main" }}
                        >
                          {formatMoney(discountInfo.discountedPrice, currency)}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">
                        {formatMoney(pkg.price, currency)}
                      </Typography>
                    )}

                    {pkg.img ? (
                      <Box
                        component="img"
                        src={pkg.img}
                        alt={pkg.name}
                        sx={{
                          width: "100%",
                          maxHeight: 170,
                          objectFit: "contain",
                          border: "2px solid",
                          borderColor: "divider",
                          p: 1,
                          bgcolor: "background.default",
                        }}
                      />
                    ) : null}

                    <Typography color="text.secondary">
                      {pkg.description || "Package details are being prepared."}
                    </Typography>

                    <Button
                      variant="outlined"
                      onClick={() => handleBuy(pkg)}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      View Package
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {!loading && !packages.length ? (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary">
              No active packages found. Add packages from the CMS dashboard.
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary">
              Loading package catalog...
            </Typography>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
};

export default Packages;
