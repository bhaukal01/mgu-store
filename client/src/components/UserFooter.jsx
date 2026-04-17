import React from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const legalLinks = [
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Cookies", to: "/cookies" },
  { label: "Acceptable Use", to: "/acceptable-use" },
];

const UserFooter = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        pt: { xs: 3.5, md: 4.5 },
        pb: { xs: 4, md: 5 },
        borderTop: "3px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        boxShadow: "inset 0 2px 0 #a8adba",
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, md: 3 },
                height: "100%",
                borderWidth: 2,
                backgroundColor: "background.default",
                boxShadow: "4px 4px 0 rgba(31, 36, 49, 0.22)",
              }}
            >
              <Typography
                variant="overline"
                sx={{ letterSpacing: "0.08em", fontWeight: 800 }}
              >
                MGU.ONE STORE
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                Player Store Support
              </Typography>
              <Typography variant="body1" sx={{ mt: 1.5 }}>
                Ranks, upgrades, and secure checkout for the MGU.ONE community.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2.5 }}
              >
                Copyright {year} MGU.ONE. All rights reserved.
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, md: 3 },
                height: "100%",
                borderWidth: 2,
                backgroundColor: "background.default",
                boxShadow: "4px 4px 0 rgba(31, 36, 49, 0.22)",
              }}
            >
              <Typography
                variant="overline"
                sx={{ letterSpacing: "0.08em", fontWeight: 800 }}
              >
                LEGAL & COMPLIANCE
              </Typography>

              <Stack
                direction="row"
                spacing={1.25}
                sx={{ mt: 1.5, flexWrap: "wrap", gap: 1.25 }}
              >
                {legalLinks.map((link) => (
                  <Button
                    key={link.to}
                    component={RouterLink}
                    to={link.to}
                    variant="outlined"
                    sx={{
                      minWidth: { xs: "100%", sm: 128 },
                      justifyContent: "center",
                      bgcolor: "background.default",
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Stack>

              <Typography variant="body1" sx={{ mt: 2.25 }}>
                These policies explain purchases, data handling, cookies, and
                account conduct for players using the store.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default UserFooter;
