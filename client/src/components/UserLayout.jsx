import React from "react";
import { Box, Container, ThemeProvider } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import StoreHeader from "./StoreHeader";
import UserFooter from "./UserFooter";
import userTheme from "../userTheme";

const routeToActive = (pathname) => {
  if (pathname.startsWith("/ranks")) return "ranks";
  if (pathname.startsWith("/packages")) return "packages";
  if (pathname.startsWith("/upgrades")) return "upgrades";
  if (pathname.startsWith("/crates")) return "crates";
  if (
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/cookies") ||
    pathname.startsWith("/acceptable-use")
  ) {
    return "";
  }
  return "home";
};

const UserLayout = () => {
  const location = useLocation();
  const active = routeToActive(location.pathname);

  return (
    <ThemeProvider theme={userTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          backgroundImage:
            "linear-gradient(to right, rgba(52,57,67,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(52,57,67,0.10) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          backgroundPosition: "top left",
        }}
      >
        <StoreHeader active={active} />
        <Box component="main" sx={{ flex: 1 }}>
          <Container
            maxWidth="lg"
            sx={{
              py: 4,
              animation: "snapIn 160ms steps(3, end)",
              "@keyframes snapIn": {
                from: { opacity: 0, transform: "translateY(8px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            <Outlet />
          </Container>
        </Box>
        <UserFooter />
      </Box>
    </ThemeProvider>
  );
};

export default UserLayout;
