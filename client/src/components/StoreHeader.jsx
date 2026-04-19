import React from "react";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import { Crown, Gem, ArrowUpCircle, Shield, PackageOpen } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const navItems = [
  { key: "home", label: "Home", to: "/", icon: Shield },
  { key: "ranks", label: "Ranks", to: "/ranks", icon: Crown },
  { key: "packages", label: "Packages", to: "/packages", icon: PackageOpen },
  {
    key: "upgrades",
    label: "Rank Upgrades",
    to: "/upgrades",
    icon: ArrowUpCircle,
  },
  { key: "crates", label: "Crates", to: "/crates", icon: Gem },
];

const StoreHeader = ({ active }) => {
  return (
    <Box
      component="header"
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "2px solid",
        borderColor: "divider",
        boxShadow: "0 2px 0 #a6abb8",
      }}
    >
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            mb: 2,
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
          }}
        >
          <Chip
            label="Official MGU.ONE Network"
            variant="outlined"
            sx={{
              px: 0.5,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          />
          <Typography variant="body2" color="text.secondary">
            Ranks, upgrades, and secure checkout
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              component={RouterLink}
              to="/"
              sx={{ display: "inline-flex", alignItems: "center" }}
            >
              <Box
                component="img"
                src="/LOGO.png"
                alt="MGU Network"
                sx={{
                  width: { xs: 120, sm: 140 },
                  border: "2px solid",
                  borderColor: "divider",
                  p: 0.5,
                  bgcolor: "background.default",
                }}
              />
            </Box>

            <Box>
              <Typography variant="h5">MGU.ONE Store</Typography>
              <Typography variant="body2" color="text.secondary">
                Instant in-game rank fulfillment
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            width={{ xs: "100%", md: "auto" }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;
              return (
                <Button
                  key={item.key}
                  component={RouterLink}
                  to={item.to}
                  variant={selected ? "contained" : "outlined"}
                  startIcon={<Icon size={16} />}
                  fullWidth
                  sx={{
                    justifyContent: "flex-start",
                    bgcolor: selected ? "primary.main" : "background.default",
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default StoreHeader;
