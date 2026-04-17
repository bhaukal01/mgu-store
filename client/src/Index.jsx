import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ArrowRight, ShieldCheck, Star, UserRound } from "lucide-react";
import axios from "axios";

import ranksData from "./data/ranks.json";

const Index = () => {
  const lifetime = ranksData.lifetimeRanks || [];
  const subscription = ranksData.subscriptionRanks || [];
  const currency = ranksData.currency || "INR";
  const allProducts = useMemo(
    () => [...lifetime, ...subscription],
    [lifetime, subscription],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topSellingRank, setTopSellingRank] = useState(null);
  const [lastBuyer, setLastBuyer] = useState(null);
  const [ongoingDiscounts, setOngoingDiscounts] = useState([]);

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

  useEffect(() => {
    let cancelled = false;

    const loadHighlights = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await axios.get(
          `${apiBaseUrl}/api/purchase/store-highlights`,
        );
        if (cancelled) return;

        setTopSellingRank(data?.topSellingRank || null);
        setLastBuyer(data?.lastBuyer || null);
        setOngoingDiscounts(
          Array.isArray(data?.ongoingDiscounts) ? data.ongoingDiscounts : [],
        );
      } catch (fetchError) {
        if (cancelled) return;
        setError(
          fetchError?.response?.data?.error ||
            "Could not load store highlights",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHighlights();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const topSellingProduct =
    allProducts.find(
      (product) =>
        product.code === topSellingRank?.productCode ||
        product.name === topSellingRank?.rank,
    ) || null;

  const lastBuyerProduct =
    allProducts.find(
      (product) =>
        product.code === lastBuyer?.productCode ||
        product.name === lastBuyer?.rank,
    ) || null;

  const discountProductsByCode = useMemo(() => {
    const map = new Map();
    allProducts.forEach((product) => {
      map.set(product.code, product);
    });
    return map;
  }, [allProducts]);

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={2}>
                <Typography variant="h2">Support MGU.ONE</Typography>
                <Typography color="text.secondary">
                  Unlock lifetime and monthly rank perks with secure checkout
                  and automatic in-game delivery.
                </Typography>

                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Card sx={{ bgcolor: "background.default" }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Lifetime Packages
                        </Typography>
                        <Typography variant="h4">{lifetime.length}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Card sx={{ bgcolor: "background.default" }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Monthly Packages
                        </Typography>
                        <Typography variant="h4">
                          {subscription.length}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Typography variant="body2" color="text.secondary">
                  Most purchases are delivered in-game within 1-4 hours.
                </Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", bgcolor: "background.default" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Typography variant="h6">Quick Actions</Typography>
                    <Card sx={{ bgcolor: "background.paper" }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Need Help?
                        </Typography>
                        <Typography>
                          Contact support on Discord for payment or delivery
                          issues.
                        </Typography>
                      </CardContent>
                    </Card>

                    <Button
                      variant="contained"
                      component={RouterLink}
                      to="/ranks"
                      endIcon={<ArrowRight size={14} />}
                    >
                      Browse Ranks
                    </Button>
                    <Button
                      variant="outlined"
                      component={RouterLink}
                      to="/upgrades"
                    >
                      Rank Upgrades
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h5">Top Selling Rank</Typography>

                {loading ? (
                  <>
                    <Skeleton variant="rectangular" height={180} />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </>
                ) : topSellingRank ? (
                  <>
                    <Box
                      component="img"
                      src={
                        topSellingProduct?.img ||
                        "https://ik.imagekit.io/1usyzu9ab/MGU.png?updatedAt=1742319283271"
                      }
                      alt={topSellingRank.rank}
                      sx={{
                        width: "100%",
                        height: 200,
                        objectFit: "contain",
                        bgcolor: "background.default",
                        border: "2px solid",
                        borderColor: "divider",
                        p: 1,
                      }}
                    />

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <Star size={16} />
                      <Typography variant="h4">
                        {topSellingRank.rank}
                      </Typography>
                      <Chip label="Top Seller" color="accent" size="small" />
                    </Stack>

                    {topSellingRank.productCode ? (
                      <Button
                        variant="outlined"
                        component={RouterLink}
                        to={`/ranks?highlight=${encodeURIComponent(topSellingRank.productCode)}`}
                      >
                        View Rank
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Typography color="text.secondary">
                    No completed purchases yet.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h5">Latest Buyer</Typography>

                {loading ? (
                  <>
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="45%" />
                  </>
                ) : lastBuyer ? (
                  <>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <UserRound size={16} />
                      <Typography>
                        <strong>{lastBuyer.username}</strong> purchased
                      </Typography>
                    </Stack>
                    <Typography variant="h4">{lastBuyer.rank}</Typography>

                    {lastBuyerProduct ? (
                      <Button
                        variant="outlined"
                        component={RouterLink}
                        to={`/ranks?highlight=${encodeURIComponent(lastBuyerProduct.code)}`}
                      >
                        View Rank
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Typography color="text.secondary">
                    No recent buyer data available yet.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h5">Ongoing Discounts</Typography>

                {loading ? (
                  <>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="50%" />
                  </>
                ) : ongoingDiscounts.length ? (
                  ongoingDiscounts.map((discount) => {
                    const product = discount.productCode
                      ? discountProductsByCode.get(discount.productCode)
                      : null;

                    return (
                      <Box
                        key={
                          discount.id ||
                          `${discount.title}-${discount.productCode || "global"}`
                        }
                        sx={{
                          border: "2px solid",
                          borderColor: "divider",
                          p: 1.5,
                          bgcolor: "background.default",
                        }}
                      >
                        <Stack spacing={0.75}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center" }}
                          >
                            <Chip label="Live" color="success" size="small" />
                            <Typography variant="h6">
                              {discount.title}
                            </Typography>
                          </Stack>

                          {discount.description ? (
                            <Typography color="text.secondary">
                              {discount.description}
                            </Typography>
                          ) : null}

                          {discount.discountType &&
                          discount.discountValue !== null ? (
                            <Typography variant="body2" color="text.secondary">
                              {discount.discountType === "percent"
                                ? `${discount.discountValue}% off`
                                : `${currency} ${discount.discountValue} off`}
                            </Typography>
                          ) : null}

                          {product ? (
                            <Button
                              variant="outlined"
                              component={RouterLink}
                              to={`/ranks?highlight=${encodeURIComponent(product.code)}`}
                              sx={{ alignSelf: "flex-start" }}
                            >
                              View Offer
                            </Button>
                          ) : null}
                        </Stack>
                      </Box>
                    );
                  })
                ) : (
                  <Typography color="text.secondary">
                    No ongoing discounts at the moment.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h5">Trusted Checkout</Typography>
            <Typography color="text.secondary">
              All payments are processed securely and your rank updates are
              handled automatically.
            </Typography>
            <Divider />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ShieldCheck size={16} />
                <Typography variant="body2">Secure payment flow</Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ArrowRight size={16} />
                <Typography variant="body2">Fast in-game delivery</Typography>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Index;
