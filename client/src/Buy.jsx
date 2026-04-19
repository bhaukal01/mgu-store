import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { load } from "@cashfreepayments/cashfree-js";
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
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Info } from "lucide-react";

import { fetchStorefrontCatalog } from "./data/cmsCatalogApi";
import {
  fetchActiveStoreDiscounts,
  formatMoney,
  getBestDiscountForProduct,
  getDiscountLabel,
} from "./data/storeDiscountApi";

const Buy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const productCodeFromQuery = searchParams.get("productCode");
  const usernameFromQuery = searchParams.get("username");
  const quoteAmountFromQuery = searchParams.get("quoteAmount");
  const modeFromQuery = searchParams.get("mode");
  const legacyState = location.state || {};
  const productCode =
    productCodeFromQuery || legacyState.productCode || legacyState.packageName;

  const [catalog, setCatalog] = useState({
    currency: "INR",
    allProducts: [],
  });
  const [catalogError, setCatalogError] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discounts, setDiscounts] = useState([]);

  const displayProduct = (catalog.allProducts || []).find(
    (p) => p.code === productCode || p.name === productCode,
  );
  const currency =
    displayProduct?.currency ||
    legacyState.currency ||
    catalog.currency ||
    "INR";
  const isSubscription =
    displayProduct?.rankKind === "subscription" ||
    displayProduct?.billingInterval === "monthly";

  const packageName =
    displayProduct?.name || legacyState.packageName || productCode;
  const packageImg = displayProduct?.img || legacyState.packageImg;
  const packagePerks = displayProduct?.perks || [];
  const price = displayProduct?.price ?? legacyState.price;

  const productDiscount = useMemo(() => {
    if (!displayProduct?.code) return null;
    return getBestDiscountForProduct(
      displayProduct.code,
      price,
      discounts,
      displayProduct.category || "ranks",
    );
  }, [displayProduct, price, discounts]);

  const fallbackAmount =
    quoteAmountFromQuery !== null && quoteAmountFromQuery !== ""
      ? Number(quoteAmountFromQuery)
      : (productDiscount?.discountedPrice ?? price);
  const isQuotedCheckout =
    quoteAmountFromQuery !== null && quoteAmountFromQuery !== "";

  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPerks, setShowPerks] = useState(false);
  const [cashfree, setCashfree] = useState(null);
  const [serverAmount, setServerAmount] = useState(null);
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

  const effectiveDisplayAmount =
    serverAmount ?? quoteData?.amount ?? fallbackAmount ?? 0;
  const hasServerQuote = Boolean(quoteData);

  useEffect(() => {
    let disposed = false;

    const loadCatalog = async () => {
      try {
        const catalogData = await fetchStorefrontCatalog();
        if (disposed) return;
        setCatalog(catalogData);
      } catch (fetchError) {
        if (disposed) return;
        setCatalogError(
          fetchError?.response?.data?.error || "Failed to load catalog details",
        );
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
            "Discount details could not be loaded",
        );
      }
    };

    loadDiscounts();

    return () => {
      disposed = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!productCode) {
      navigate("/ranks");
    }

    if (usernameFromQuery && !username) {
      setUsername(usernameFromQuery);
    }

    async function initializeSDK() {
      const mode = (
        import.meta.env.VITE_CASHFREE_MODE || "production"
      ).toLowerCase();
      const sdk = await load({
        mode: mode === "sandbox" ? "sandbox" : "production",
      });
      setCashfree(sdk);
    }
    initializeSDK();
  }, [productCode, navigate, usernameFromQuery]);

  const requestServerQuote = async ({
    couponOverride,
    showValidationError = true,
  } = {}) => {
    const usernameValue = username.trim();
    if (!usernameValue) {
      if (showValidationError) {
        setErrorMessage(
          "Enter your username to calculate final payable amount.",
        );
      }
      return null;
    }

    const couponForRequest =
      couponOverride !== undefined
        ? couponOverride
        : (appliedCouponCode || couponCodeInput).trim();

    setQuoteLoading(true);
    if (showValidationError) {
      setErrorMessage("");
    }

    try {
      const { data } = await axios.post(`${apiBaseUrl}/api/purchase/quote`, {
        username: usernameValue,
        productCode,
        mode: modeFromQuery === "rankup" ? "rankup" : "buy",
        couponCode: couponForRequest || null,
      });

      setQuoteData(data);
      setAppliedCouponCode(String(data?.couponCodeApplied || "").trim());
      return data;
    } catch (error) {
      setQuoteData(null);
      if (couponOverride !== undefined) {
        setAppliedCouponCode("");
      }

      if (showValidationError) {
        setErrorMessage(
          error?.response?.data?.error || "Failed to calculate final quote.",
        );
      }
      return null;
    } finally {
      setQuoteLoading(false);
    }
  };

  const applyCoupon = async () => {
    const normalizedCoupon = couponCodeInput.trim().toUpperCase();
    if (!normalizedCoupon) {
      setErrorMessage("Enter a coupon code before applying.");
      return;
    }

    setCouponCodeInput(normalizedCoupon);
    await requestServerQuote({ couponOverride: normalizedCoupon });
  };

  const removeCoupon = async () => {
    setCouponCodeInput("");
    setAppliedCouponCode("");
    await requestServerQuote({
      couponOverride: "",
      showValidationError: false,
    });
  };

  const handlePayment = async () => {
    if (!username.trim()) {
      setErrorMessage("Please enter your Minecraft username.");
      return;
    }

    try {
      const { data } = await axios.post(`${apiBaseUrl}/api/purchase/buy`, {
        username,
        productCode,
        mode: modeFromQuery === "rankup" ? "rankup" : "buy",
        couponCode: (appliedCouponCode || couponCodeInput).trim() || null,
      });

      if (data.amount !== undefined) setServerAmount(data.amount);
      if (data?.couponCodeApplied) {
        setAppliedCouponCode(String(data.couponCodeApplied));
      }

      setQuoteData((prev) => ({
        ...prev,
        amount: data.amount,
        baseAmount: data.baseAmount ?? prev?.baseAmount ?? price,
        discountAmount: data.discountAmount ?? prev?.discountAmount,
        discountAmountUpfront:
          data.discountAmountUpfront ??
          data.discountAmountAutomatic ??
          prev?.discountAmountUpfront,
        discountAmountAutomatic:
          data.discountAmountAutomatic ?? prev?.discountAmountAutomatic,
        discountAmountCoupon:
          data.discountAmountCoupon ?? prev?.discountAmountCoupon,
        upfrontPromotion:
          data.upfrontPromotion ??
          data.automaticPromotion ??
          prev?.upfrontPromotion,
        automaticPromotion: data.automaticPromotion ?? prev?.automaticPromotion,
        couponPromotion: data.couponPromotion ?? prev?.couponPromotion,
        couponCodeApplied: data.couponCodeApplied ?? prev?.couponCodeApplied,
        couponIgnoredReason:
          data.couponIgnoredReason ?? prev?.couponIgnoredReason,
      }));

      if (data.paymentSessionId && data.orderId && cashfree) {
        cashfree
          .checkout({
            paymentSessionId: data.paymentSessionId,
            redirectTarget: "_modal", // Opens payment in a popup
          })
          .then(async (result) => {
            if (result.error) {
              console.error("Payment Error:", result.error);
              setErrorMessage("Payment failed. Please try again.");
            }
            if (result.paymentDetails) {
              console.log(
                "✅ Payment Success:",
                result.paymentDetails.paymentMessage,
              );
              // The backend verifies payment via Cashfree and then fulfills via the proxy plugin.
              navigate(`/success?orderId=${encodeURIComponent(data.orderId)}`);
            }
          });
      } else {
        setErrorMessage("Failed to initiate payment. Try again.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || "Error processing request. Try again.",
      );
      console.error("Payment Error:", error.response?.data || error.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h3">Checkout</Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Selected Package</Typography>
                <Typography>{packageName || "No package selected"}</Typography>

                {packageImg ? (
                  <Box
                    component="img"
                    src={packageImg}
                    alt="Package"
                    sx={{
                      width: 180,
                      height: 180,
                      objectFit: "contain",
                      border: "2px solid",
                      borderColor: "divider",
                      p: 1,
                      bgcolor: "background.default",
                    }}
                  />
                ) : null}

                <Box
                  sx={{
                    border: "2px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                    p: 1.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Final Price
                  </Typography>
                  {serverAmount !== null ? (
                    <Typography variant="h5">
                      {formatMoney(serverAmount, currency)}
                      {isSubscription ? "/month" : ""}
                    </Typography>
                  ) : hasServerQuote ? (
                    <Stack spacing={0.5}>
                      {Number(quoteData?.baseAmount || 0) >
                      Number(effectiveDisplayAmount || 0) ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textDecoration: "line-through" }}
                        >
                          {formatMoney(quoteData.baseAmount, currency)}
                          {isSubscription ? "/month" : ""}
                        </Typography>
                      ) : null}

                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", flexWrap: "wrap" }}
                      >
                        <Typography variant="h5">
                          {formatMoney(effectiveDisplayAmount, currency)}
                          {isSubscription ? "/month" : ""}
                        </Typography>

                        {quoteData?.upfrontPromotion ||
                        quoteData?.automaticPromotion ? (
                          <Chip
                            label={
                              (
                                quoteData.upfrontPromotion ||
                                quoteData.automaticPromotion
                              )?.kind === "coupon"
                                ? "Auto Coupon"
                                : "Upfront Discount"
                            }
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : null}

                        {quoteData?.couponPromotion ? (
                          <Chip
                            label={`Coupon ${quoteData.couponPromotion.code || "Applied"}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack spacing={0.5}>
                      {productDiscount && !isQuotedCheckout ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textDecoration: "line-through" }}
                        >
                          {formatMoney(price, currency)}
                          {isSubscription ? "/month" : ""}
                        </Typography>
                      ) : null}

                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", flexWrap: "wrap" }}
                      >
                        <Typography variant="h5">
                          {formatMoney(fallbackAmount ?? 0, currency)}
                          {isSubscription ? "/month" : ""}
                        </Typography>
                        {productDiscount && !isQuotedCheckout ? (
                          <Chip
                            label={getDiscountLabel(productDiscount)}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                  )}
                </Box>

                {packagePerks.length ? (
                  <Button
                    variant="outlined"
                    startIcon={<Info size={14} />}
                    onClick={() => setShowPerks(true)}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    View Perks
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Typography variant="h6">Player Verification</Typography>

                {catalogError ? (
                  <Alert severity="warning">{catalogError}</Alert>
                ) : null}

                {discountError ? (
                  <Alert severity="warning">{discountError}</Alert>
                ) : null}

                <TextField
                  label="In-Game Username"
                  placeholder="Your Minecraft Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <TextField
                    label="Coupon Code"
                    placeholder="Enter coupon"
                    value={couponCodeInput}
                    onChange={(e) =>
                      setCouponCodeInput(e.target.value.toUpperCase())
                    }
                    size="small"
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={applyCoupon}
                    disabled={quoteLoading}
                  >
                    Apply Coupon
                  </Button>
                  {appliedCouponCode ? (
                    <Chip
                      label={`Applied ${appliedCouponCode}`}
                      color="secondary"
                      variant="outlined"
                      onDelete={removeCoupon}
                      disabled={quoteLoading}
                      sx={{
                        height: 36,
                        px: 0.25,
                        "& .MuiChip-label": {
                          fontWeight: 600,
                        },
                      }}
                    />
                  ) : null}
                </Stack>

                {hasServerQuote ? (
                  <Alert severity="info">
                    Base: {formatMoney(quoteData.baseAmount, currency)} |
                    Discount:{" "}
                    {formatMoney(
                      Number(quoteData.discountAmount || 0),
                      currency,
                    )}{" "}
                    | Payable: {formatMoney(quoteData.amount, currency)}
                    {quoteData?.couponIgnoredReason
                      ? ` (${quoteData.couponIgnoredReason})`
                      : ""}
                  </Alert>
                ) : null}

                {errorMessage ? (
                  <Alert severity="error">{errorMessage}</Alert>
                ) : null}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button variant="contained" onClick={handlePayment} fullWidth>
                    Proceed to Payment
                  </Button>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/"
                    fullWidth
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={showPerks}
        onClose={() => setShowPerks(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{packageName} Perks</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            {packagePerks.length ? (
              packagePerks.map((perk, index) => (
                <Chip
                  key={`${productCode || "package"}-perk-${index}`}
                  label={perk}
                  variant="outlined"
                  sx={{ justifyContent: "flex-start" }}
                />
              ))
            ) : (
              <Typography color="text.secondary">
                No perk details available.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowPerks(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default Buy;
