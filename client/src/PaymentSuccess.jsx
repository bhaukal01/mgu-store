import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000",
    [],
  );

  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // ~60s

    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/purchase/status/${encodeURIComponent(orderId)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to fetch status");
        if (!cancelled) {
          setStatus(json.status);
          setError(null);
        }
        if (json.status === "completed" || attempts >= maxAttempts) return;
        setTimeout(tick, 2000);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to fetch status");
        if (attempts >= maxAttempts) return;
        setTimeout(tick, 3000);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, orderId]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Typography variant="h3">Payment Successful</Typography>
          <Typography color="text.secondary">
            Transaction accepted. Fulfillment task has been queued.
          </Typography>

          {orderId ? (
            <Box
              sx={{
                border: "2px solid",
                borderColor: "divider",
                bgcolor: "background.default",
                p: 1.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Order ID
              </Typography>
              <Typography>{orderId}</Typography>
            </Box>
          ) : (
            <Typography color="text.secondary">
              Keep your payment reference available and contact support if rank
              fulfillment is delayed.
            </Typography>
          )}

          {orderId ? (
            <Chip
              label={`Status: ${status || "checking"}`}
              color={status === "completed" ? "success" : "default"}
              variant={status === "completed" ? "filled" : "outlined"}
              sx={{ width: "fit-content" }}
            />
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button
            variant="contained"
            onClick={() => navigate("/")}
            sx={{ alignSelf: "flex-start" }}
          >
            Return to Store
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PaymentSuccess;
