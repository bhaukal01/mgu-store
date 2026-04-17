import React, { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowRight, Calculator } from "lucide-react";

import axios from "axios";

import ranksData from "./data/ranks.json";

const ranks = ranksData.lifetimeRanks || [];
const currency = ranksData.currency || "INR";

const RankUp = () => {
  const navigate = useNavigate();

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

  const [username, setUsername] = useState("");
  const [step, setStep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentLifetimeRank, setCurrentLifetimeRank] = useState(null);
  const [subscriptionRank, setSubscriptionRank] = useState(null);

  const [selectedTargetCode, setSelectedTargetCode] = useState("");
  const [baseCode, setBaseCode] = useState(ranks[0]?.code || "");
  const [targetCode, setTargetCode] = useState(ranks[1]?.code || "");

  const currentRankObj = useMemo(() => {
    if (!currentLifetimeRank) return null;
    return ranks.find((r) => r.code === currentLifetimeRank) || null;
  }, [currentLifetimeRank]);

  const upgradeOptions = useMemo(() => {
    if (!currentRankObj) return [];
    const currentIdx = ranks.findIndex((r) => r.code === currentRankObj.code);
    if (currentIdx < 0) return [];

    return ranks.slice(currentIdx + 1).map((target) => {
      const cost = Math.max(
        1,
        Number(target.price) - Number(currentRankObj.price) - 1,
      );
      return {
        code: target.code,
        name: target.name,
        cost,
      };
    });
  }, [currentRankObj]);

  const estimatedUpgrade = useMemo(() => {
    const base = ranks.find((rank) => rank.code === baseCode);
    const target = ranks.find((rank) => rank.code === targetCode);

    if (!base || !target) return null;

    return {
      from: base.name,
      to: target.name,
      amount: Math.max(0, Number(target.price) - Number(base.price)),
    };
  }, [baseCode, targetCode]);

  const closePopup = () => {
    setStep(null);
    setLoading(false);
    setError("");
    setCurrentLifetimeRank(null);
    setSubscriptionRank(null);
    setSelectedTargetCode("");
  };

  const isValidMcUsername = (value) => /^[A-Za-z0-9_]{3,16}$/.test(value);

  const start = () => {
    setError("");
    setStep("ask-username");
  };

  const checkRank = async () => {
    const u = username.trim();
    if (!isValidMcUsername(u)) {
      setError("Enter a valid Minecraft username (3-16, letters/numbers/_).");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(
        `${apiBaseUrl}/api/purchase/user-ranks`,
        {
          params: { username: u },
        },
      );

      const lifetime = data?.lifetimeRank || null;
      const sub = data?.subscriptionRank || null;

      setCurrentLifetimeRank(lifetime);
      setSubscriptionRank(sub);

      if (!lifetime && sub) {
        setStep("subscription-not-valid");
      } else if (!lifetime && !sub) {
        setStep("no-rank");
      } else {
        setStep("choose-upgrade");
      }
    } catch (e) {
      setError(e.response?.data?.error || "Failed to check rank. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToPayment = () => {
    const u = username.trim();
    if (!selectedTargetCode) {
      setError("Please select a rank to upgrade to.");
      return;
    }

    const selected = upgradeOptions.find((o) => o.code === selectedTargetCode);
    const quotedAmount = selected ? String(selected.cost) : "";

    navigate(
      `/buy?productCode=${encodeURIComponent(selectedTargetCode)}&username=${encodeURIComponent(u)}&mode=rankup${quotedAmount ? `&quoteAmount=${encodeURIComponent(quotedAmount)}` : ""}`,
    );
  };

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h3">Rank Upgrades</Typography>
            <Typography color="text.secondary">
              Check your current rank and see upgrade options available for your
              account.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={start}
              endIcon={<ArrowRight size={14} />}
              size="large"
              sx={{ alignSelf: "flex-start", minWidth: 240 }}
            >
              Check My Rank & Upgrade
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Calculator size={18} />
              <Typography variant="h6">Upgrade Cost Estimator</Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Current Rank
                  </Typography>
                  <Select
                    value={baseCode}
                    onChange={(eventItem) =>
                      setBaseCode(eventItem.target.value)
                    }
                  >
                    {ranks.map((rank) => (
                      <MenuItem value={rank.code} key={`${rank.code}-base`}>
                        {rank.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Target Rank
                  </Typography>
                  <Select
                    value={targetCode}
                    onChange={(eventItem) =>
                      setTargetCode(eventItem.target.value)
                    }
                  >
                    {ranks.map((rank) => (
                      <MenuItem value={rank.code} key={`${rank.code}-target`}>
                        {rank.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  sx={{
                    border: "2px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                    minHeight: 82,
                    px: 2,
                    py: 1.25,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Estimated Difference
                  </Typography>
                  <Typography variant="h5">
                    {estimatedUpgrade
                      ? `${currency} ${estimatedUpgrade.amount}`
                      : "-"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(step)}
        onClose={loading ? undefined : closePopup}
        fullWidth
        maxWidth="sm"
      >
        {step === "ask-username" && (
          <>
            <DialogTitle>Enter Username</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Typography color="text.secondary">
                  We detect your current rank from your purchase history.
                </Typography>
                <TextField
                  placeholder="Minecraft Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={closePopup} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={checkRank}
                disabled={loading}
              >
                {loading ? "Checking..." : "Continue"}
              </Button>
            </DialogActions>
          </>
        )}

        {step === "subscription-not-valid" && (
          <>
            <DialogTitle>Rank Up Not Available</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                <Typography color="text.secondary">
                  Subscription and monthly ranks are not eligible for rank
                  upgrades.
                </Typography>
                <Typography>
                  Detected rank: <strong>{subscriptionRank}</strong>
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button component={RouterLink} to="/ranks" variant="outlined">
                Buy Lifetime Rank
              </Button>
              <Button variant="contained" onClick={closePopup}>
                Close
              </Button>
            </DialogActions>
          </>
        )}

        {step === "no-rank" && (
          <>
            <DialogTitle>No Lifetime Rank Found</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                <Typography color="text.secondary">
                  No lifetime rank purchase was found for username
                  {` ${username.trim()}`}. Buy a lifetime rank first.
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button component={RouterLink} to="/ranks" variant="outlined">
                Go to Ranks
              </Button>
              <Button variant="contained" onClick={closePopup}>
                Close
              </Button>
            </DialogActions>
          </>
        )}

        {step === "choose-upgrade" && (
          <>
            <DialogTitle>Select Upgrade</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Typography>
                  Current rank: <strong>{currentLifetimeRank}</strong>
                </Typography>

                {upgradeOptions.length === 0 ? (
                  <Alert severity="info">
                    You already have the highest rank.
                  </Alert>
                ) : (
                  <RadioGroup
                    value={selectedTargetCode}
                    onChange={(e) => setSelectedTargetCode(e.target.value)}
                  >
                    {upgradeOptions.map((opt) => (
                      <Box
                        key={opt.code}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          px: 2,
                          py: 1,
                          mb: 1,
                        }}
                      >
                        <FormControlLabel
                          value={opt.code}
                          control={<Radio />}
                          label={
                            <Stack
                              direction="row"
                              spacing={2}
                              sx={{ alignItems: "center" }}
                            >
                              <Typography>{opt.name}</Typography>
                              <Typography color="text.secondary">
                                {currency} {opt.cost}
                              </Typography>
                            </Stack>
                          }
                        />
                      </Box>
                    ))}
                  </RadioGroup>
                )}

                {error ? <Alert severity="error">{error}</Alert> : null}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={closePopup}>Close</Button>
              <Button
                variant="contained"
                onClick={goToPayment}
                disabled={!upgradeOptions.length}
              >
                Continue to Checkout
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
};

export default RankUp;
