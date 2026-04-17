import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/orbitron/500.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import Index from "./Index.jsx";
import Ranks from "./Ranks.jsx";
import Crates from "./Crates.jsx";
import RankUp from "./RankUp.jsx";
import Buy from "./Buy.jsx";
import AdminLogin from "./AdminLogin.jsx"; // New for admin login
import AdminDashboard from "./AdminDashboard.jsx"; // New for admin panel
import PaymentSuccess from "./PaymentSuccess.jsx";
import Terms from "./Terms.jsx";
import PrivacyPolicy from "./PrivacyPolicy.jsx";
import CookiesPolicy from "./CookiesPolicy.jsx";
import AcceptableUse from "./AcceptableUse.jsx";
import UserLayout from "./components/UserLayout";
import theme from "./theme";
import adminTheme from "./adminTheme";

import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route element={<UserLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/ranks" element={<Ranks />} />
            <Route path="/crates" element={<Crates />} />
            <Route path="/upgrades" element={<RankUp />} />
            <Route path="/buy" element={<Buy />} />
            <Route path="/success" element={<PaymentSuccess />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiesPolicy />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ThemeProvider theme={adminTheme}>
                <CssBaseline />
                <AdminLogin />
              </ThemeProvider>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ThemeProvider theme={adminTheme}>
                <CssBaseline />
                <AdminDashboard />
              </ThemeProvider>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  </StrictMode>,
);
