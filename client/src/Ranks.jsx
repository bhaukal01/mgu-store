import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { Info } from "lucide-react";

import { fetchStorefrontCatalog } from "./data/cmsCatalogApi";
import {
  fetchActiveStoreDiscounts,
  formatMoney,
  getBestDiscountForProduct,
  getDiscountLabel,
  getOfferAnchorId,
} from "./data/storeDiscountApi";

const Ranks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [popupRank, setPopupRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [ranks, setRanks] = useState([]);
  const [subscriptionRanks, setSubscriptionRanks] = useState([]);
  const [currency, setCurrency] = useState("INR");
  const [discounts, setDiscounts] = useState([]);

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
  const highlightCode = new URLSearchParams(location.search).get("highlight");

  useEffect(() => {
    let disposed = false;

    const loadCatalog = async () => {
      setLoading(true);
      setError("");

      try {
        const catalog = await fetchStorefrontCatalog();
        if (disposed) return;

        setRanks(catalog.lifetimeRanks || []);
        setSubscriptionRanks(catalog.subscriptionRanks || []);
        setCurrency(catalog.currency || "INR");
      } catch (catalogError) {
        if (disposed) return;
        setError(
          catalogError?.response?.data?.error || "Failed to load ranks catalog",
        );
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    loadCatalog();

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

  const discountsByProductCode = useMemo(() => {
    const map = new Map();
    [...ranks, ...subscriptionRanks].forEach((product) => {
      const best = getBestDiscountForProduct(
        product.code,
        product.price,
        discounts,
        product.category || "ranks",
      );
      if (best) {
        map.set(product.code, best);
      }
    });
    return map;
  }, [ranks, subscriptionRanks, discounts]);

  const handleBuy = (rank) => {
    navigate(`/buy?productCode=${encodeURIComponent(rank.code || rank.name)}`);
  };

  const renderRankSection = (title, list, suffix = "") => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {title}
      </Typography>

      <Grid container spacing={3}>
        {list.map((rank) => {
          const discountInfo = discountsByProductCode.get(rank.code);
          const isHighlighted =
            Boolean(highlightCode) && rank.code === highlightCode;

          return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={rank.code}>
              <Card sx={{ height: "100%" }}>
                <CardContent
                  id={getOfferAnchorId(rank.code)}
                  sx={{
                    p: 2.5,
                    border: isHighlighted ? "2px solid" : "none",
                    borderColor: isHighlighted ? "success.main" : "transparent",
                  }}
                >
                  <Box
                    sx={{
                      height: 6,
                      bgcolor: "primary.main",
                      border: "2px solid",
                      borderColor: "divider",
                      mb: 2,
                    }}
                  />
                  <Box
                    sx={{
                      height: 148,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Box
                      component="img"
                      src={rank.img}
                      alt={rank.name}
                      sx={{ maxHeight: 132, objectFit: "contain" }}
                    />
                  </Box>

                  <Typography variant="h5">{rank.name}</Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5, mb: 2.5 }}>
                    {discountInfo ? (
                      <>
                        <Typography
                          color="text.secondary"
                          sx={{ textDecoration: "line-through" }}
                        >
                          {formatMoney(rank.price, currency)}
                          {suffix}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "center", flexWrap: "wrap" }}
                        >
                          <Typography
                            sx={{ fontWeight: 700, color: "error.main" }}
                          >
                            {formatMoney(
                              discountInfo.discountedPrice,
                              currency,
                            )}
                            {suffix}
                          </Typography>
                          <Chip
                            label={getDiscountLabel(discountInfo)}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          {isHighlighted ? (
                            <Chip
                              label="Highlighted Offer"
                              size="small"
                              color="accent"
                              variant="filled"
                            />
                          ) : null}
                        </Stack>
                      </>
                    ) : (
                      <Typography color="text.secondary">
                        {formatMoney(rank.price, currency)}
                        {suffix}
                      </Typography>
                    )}
                  </Stack>

                  <Grid container spacing={0.75} sx={{ mb: 2.5 }}>
                    {(rank.perks || []).slice(0, 6).map((perk, index) => (
                      <Grid
                        size={{ xs: 6 }}
                        key={`${rank.code}-preview-${index}`}
                      >
                        <Box
                          sx={{
                            minHeight: 52,
                            px: 1,
                            py: 0.75,
                            border: "2px solid",
                            borderColor: "divider",
                            bgcolor: "background.default",
                            display: "flex",
                            alignItems: "center",
                            fontSize: "0.75rem",
                            lineHeight: 1.2,
                            color: "text.secondary",
                          }}
                        >
                          {perk}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={() => handleBuy(rank)}
                      fullWidth
                    >
                      Buy
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setPopupRank(rank)}
                      startIcon={<Info size={16} />}
                      fullWidth
                    >
                      Details
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {!list.length ? (
          <Grid size={{ xs: 12 }}>
            <Typography color="text.secondary">
              No active products found in this section.
            </Typography>
          </Grid>
        ) : null}
      </Grid>
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h3">Rank Packages</Typography>
            <Typography color="text.secondary">
              Choose a package and open details for the full perk list before
              checkout.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {discountError ? <Alert severity="warning">{discountError}</Alert> : null}

      {loading ? (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary">
              Loading rank catalog...
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Box>
        {renderRankSection("Lifetime Ranks", ranks)}
        {renderRankSection("Subscription Ranks", subscriptionRanks, "/month")}
      </Box>

      <Dialog
        open={Boolean(popupRank)}
        onClose={() => setPopupRank(null)}
        fullWidth
        maxWidth="sm"
      >
        {popupRank ? (
          <>
            <DialogTitle>{popupRank.name}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Box
                  component="img"
                  src={popupRank.img}
                  alt={popupRank.name}
                  sx={{ width: 120, height: 120, objectFit: "contain" }}
                />

                {(() => {
                  const popupDiscount = discountsByProductCode.get(
                    popupRank.code,
                  );

                  if (!popupDiscount) {
                    return (
                      <Typography color="text.secondary">
                        {formatMoney(popupRank.price, currency)}
                      </Typography>
                    );
                  }

                  return (
                    <Stack spacing={0.5}>
                      <Typography
                        color="text.secondary"
                        sx={{ textDecoration: "line-through" }}
                      >
                        {formatMoney(popupRank.price, currency)}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", flexWrap: "wrap" }}
                      >
                        <Typography
                          sx={{ fontWeight: 700, color: "error.main" }}
                        >
                          {formatMoney(popupDiscount.discountedPrice, currency)}
                        </Typography>
                        <Chip
                          label={getDiscountLabel(popupDiscount)}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  );
                })()}

                <Stack spacing={1}>
                  {(popupRank.perks || []).map((item, index) => (
                    <Chip
                      key={`${popupRank.code}-perk-${index}`}
                      label={item}
                      variant="outlined"
                      sx={{ justifyContent: "flex-start" }}
                    />
                  ))}
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setPopupRank(null)}>Close</Button>
              <Button variant="contained" onClick={() => handleBuy(popupRank)}>
                Buy
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Stack>
  );
};

export default Ranks;
