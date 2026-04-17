import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

const crates = [
  {
    name: "Nether Armory Crate",
    price: "349",
    info: "Weapon skins, trail effects, and combat banner drops.",
    status: "Soon",
  },
  {
    name: "Overworld Builder Crate",
    price: "299",
    info: "Build particles, island cosmetics, and structure themes.",
    status: "Planned",
  },
];

const Crates = () => {
  const navigate = useNavigate();

  const handleBuy = (crate) => {
    navigate(`/buy?productCode=${encodeURIComponent(crate.name)}`);
  };

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h3">Crate Vault</Typography>
            <Typography color="text.secondary">
              Crates are in production and will launch in phased drops with
              fixed pricing and transparent odds.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {crates.map((crate) => (
          <Grid size={{ xs: 12, md: 6 }} key={crate.name}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 1,
                      border: "2px solid",
                      borderColor: "divider",
                      bgcolor: "background.default",
                      display: "inline-flex",
                      alignSelf: "flex-start",
                    }}
                  >
                    <Typography variant="body2">{crate.status}</Typography>
                  </Box>
                  <Typography variant="h5">{crate.name}</Typography>
                  <Typography color="text.secondary">
                    INR {crate.price}
                  </Typography>
                  <Typography color="text.secondary">{crate.info}</Typography>
                  <Button
                    variant="outlined"
                    onClick={() => handleBuy(crate)}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Queue Interest
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default Crates;
