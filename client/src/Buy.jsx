import React, { useState, useEffect } from "react";
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

import ranksData from "./data/ranks.json";

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

  const allRankProducts = [
    ...(ranksData.lifetimeRanks || []),
    ...(ranksData.subscriptionRanks || []),
  ];
  const displayProduct = allRankProducts.find((p) => p.code === productCode);
  const currency = ranksData.currency || "INR";
  const isSubscription = (ranksData.subscriptionRanks || []).some(
    (p) => p.code === productCode,
  );

  const packageName =
    displayProduct?.name || legacyState.packageName || productCode;
  const packageImg = displayProduct?.img || legacyState.packageImg;
  const packagePerks = displayProduct?.perks || [];
  const price = displayProduct?.price ?? legacyState.price;

  const fallbackAmount =
    quoteAmountFromQuery !== null && quoteAmountFromQuery !== ""
      ? Number(quoteAmountFromQuery)
      : price;

  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPerks, setShowPerks] = useState(false);
  const [cashfree, setCashfree] = useState(null);
  const [serverAmount, setServerAmount] = useState(null);
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

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
  }, [productCode, navigate, usernameFromQuery, username]);

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
      });

      if (data.amount !== undefined) setServerAmount(data.amount);

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
                  <Typography variant="h5">
                    {currency} {serverAmount ?? fallbackAmount ?? 0}
                    {isSubscription ? "/month" : ""}
                  </Typography>
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
                <TextField
                  label="In-Game Username"
                  placeholder="Your Minecraft Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

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
