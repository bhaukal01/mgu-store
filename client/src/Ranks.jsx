import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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

import ranksData from "./data/ranks.json";

const ranks = ranksData.lifetimeRanks || [];
const subscriptionRanks = ranksData.subscriptionRanks || [];
const currency = ranksData.currency || "INR";

const Ranks = () => {
  const navigate = useNavigate();
  const [popupRank, setPopupRank] = useState(null);

  const handleBuy = (rank) => {
    navigate(`/buy?productCode=${encodeURIComponent(rank.code)}`);
  };

  const renderRankSection = (title, list, suffix = "") => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {title}
      </Typography>

      <Grid container spacing={3}>
        {list.map((rank) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={rank.code}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: 2.5 }}>
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
                <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
                  {currency} {rank.price}
                  {suffix}
                </Typography>

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
        ))}
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

                <Typography color="text.secondary">
                  {currency} {popupRank.price}
                </Typography>

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
